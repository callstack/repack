import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import execa from 'execa';
import packageJson from '../../../package.json';
import { runAdbReverse } from '../common/runAdbReverse.js';
import {
  createRnbinFixtures,
  type RnbinFixtures,
} from '../federation/__tests__/helpers/rnbinFixtures.js';
import * as portPlanner from '../federation/portPlanner.js';
import * as rnBin from '../federation/rnBin.js';
import * as wizard from '../federation/wizard.js';
import { federationDev } from '../federation-dev.js';

jest.mock('execa');
const execaMock = execa as unknown as jest.Mock;

jest.mock('../common/runAdbReverse.js');
const adbMock = runAdbReverse as jest.Mock;

class FakeChild extends EventEmitter {
  stdout = new PassThrough();
  stderr = new PassThrough();
  kill = jest.fn();
}

const FIXTURES = path.join(
  __dirname,
  '..',
  'federation',
  '__tests__',
  '__fixtures__'
);
const TWIN = path.join(FIXTURES, 'config-dev-twin');

const cliConfig = {
  root: '/project',
  platforms: ['ios'],
  reactNativePath: '/project/node_modules/react-native',
};

let exitSpy: jest.SpyInstance;
let logSpy: jest.SpyInstance;
let errorSpy: jest.SpyInstance;
let stdoutSpy: jest.SpyInstance;
let tmpDir: string;
let previousCwd: string;

// The command's stdout owner writes escape sequences straight to
// process.stdout; the sink's output has to be captured alongside console.
const output = () =>
  [...logSpy.mock.calls, ...errorSpy.mock.calls, ...stdoutSpy.mock.calls]
    .map((call) => call.map(String).join(' '))
    .join('\n');

/** JSON docs the sink wrote to stdout, oldest first. */
const stdoutDocs = () =>
  stdoutSpy.mock.calls
    .map((call: unknown[]) => String(call[0]))
    .join('')
    .split('\n')
    .filter((line: string) => line.startsWith('{'))
    .map((line: string) => JSON.parse(line));

beforeEach(() => {
  previousCwd = process.cwd();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fed-dev-'));
  exitSpy = jest
    .spyOn(process, 'exit')
    .mockImplementation((() => undefined) as never);
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  stdoutSpy = jest
    .spyOn(process.stdout, 'write')
    .mockImplementation((() => true) as never);
  // Deterministic probes: the developer's machine may really hold 8081/8082.
  jest.spyOn(portPlanner, 'isPortBusy').mockResolvedValue(false);
  process.chdir(TWIN);
});

afterEach(() => {
  process.chdir(previousCwd);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  jest.restoreAllMocks();
});

describe('federation-dev usage errors (exit 2, spawn nothing)', () => {
  it('missing workspace file names repack-federation.json and federation-init', async () => {
    process.chdir(tmpDir);
    await federationDev([], cliConfig, {
      apps: 'MiniApp',
      interactive: false,
    });
    expect(exitSpy).toHaveBeenCalledWith(2);
    expect(output()).toContain('repack-federation.json');
    expect(output()).toContain('federation-init');
    expect(execaMock).not.toHaveBeenCalled();
  });

  it('invalid file names the path and the failing field, no stack', async () => {
    fs.writeFileSync(
      path.join(tmpDir, 'repack-federation.json'),
      JSON.stringify({ host: { root: '.' }, remotes: {} })
    );
    process.chdir(tmpDir);
    await federationDev([], cliConfig, { interactive: false });
    expect(exitSpy).toHaveBeenCalledWith(2);
    const text = output();
    expect(text).toContain(path.join(tmpDir, 'repack-federation.json'));
    expect(text).toContain('host.manifest');
    expect(text).not.toMatch(/\n\s+at\s/);
    expect(execaMock).not.toHaveBeenCalled();
  });

  it('unknown --apps name is named and known remotes are listed', async () => {
    await federationDev([], cliConfig, {
      apps: 'NoSuchApp',
      interactive: false,
    });
    expect(exitSpy).toHaveBeenCalledWith(2);
    expect(output()).toContain('NoSuchApp');
    // Lists the known remote so the user sees the typo's alternative.
    expect(output()).toContain('MiniApp');
    expect(execaMock).not.toHaveBeenCalled();
  });

  it('a flag-shaped --apps value is an unknown name, not an option', async () => {
    // Threat row "Subprocess spawn": `--apps --no-interactive` never reaches
    // any spawn argv — it is rejected as an unknown app name.
    await federationDev([], cliConfig, {
      apps: '--no-interactive',
      interactive: false,
    });
    expect(exitSpy).toHaveBeenCalledWith(2);
    expect(output()).toContain('--no-interactive');
    expect(execaMock).not.toHaveBeenCalled();
  });

  it('--platform web exits 2 naming ios and android', async () => {
    await federationDev([], cliConfig, {
      platform: 'web',
      interactive: false,
    });
    expect(exitSpy).toHaveBeenCalledWith(2);
    expect(output()).toContain('ios');
    expect(output()).toContain('android');
    expect(execaMock).not.toHaveBeenCalled();
  });

  it('a non-integer --port exits 2', async () => {
    await federationDev([], cliConfig, {
      port: Number('abc'),
      interactive: false,
    });
    expect(exitSpy).toHaveBeenCalledWith(2);
    expect(execaMock).not.toHaveBeenCalled();
  });

  it('standalone on an undeclared remote exits 2 naming the remote and the field', async () => {
    process.chdir(path.join(FIXTURES, 'config-standalone'));
    await federationDev([], cliConfig, {
      standalone: 'undeclared',
      interactive: false,
    });
    expect(exitSpy).toHaveBeenCalledWith(2);
    expect(output()).toContain('undeclared');
    expect(output()).toContain('standalone');
    expect(execaMock).not.toHaveBeenCalled();
  });
});

describe('federation-dev dry-run port conflicts (command wiring)', () => {
  beforeEach(() => {
    // Twin fixture declares 8081/8082; make MiniApp's declared port busy.
    jest
      .spyOn(portPlanner, 'isPortBusy')
      .mockImplementation(async (port: number) => port === 8082);
  });

  it('a busy declared port fails the dry run: exit 1, names app+port, spawns nothing', async () => {
    await federationDev([], cliConfig, { dryRun: true, interactive: false });
    expect(exitSpy).toHaveBeenCalledWith(1);
    const text = output();
    expect(text).toContain('MiniApp');
    expect(text).toContain('8082');
    expect(execaMock).not.toHaveBeenCalled();
  });

  it('--auto-ports rescues the same conflict: plan prints with auto, exit 0', async () => {
    await federationDev([], cliConfig, {
      dryRun: true,
      json: true,
      autoPorts: true,
      interactive: false,
    });
    expect(exitSpy).toHaveBeenCalledWith(0);
    const plan = stdoutDocs()[0];
    const mini = plan.apps.find(
      (app: { name: string }) => app.name === 'MiniApp'
    );
    expect(mini.port).toBeNull(); // `auto` discipline: null in JSON, no spawn
    expect(execaMock).not.toHaveBeenCalled();
  });
});

describe('federation-dev --config <path>', () => {
  it('loads the specific file and anchors the plan on its directory', async () => {
    // cwd sits on the twin fixture on purpose: --config must beat the
    // walk-up default, and every plan path anchors on the FILE's dir.
    const configPath = path.join(tmpDir, 'custom-federation.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        host: { manifest: './build/host', root: '.', port: 8123 },
        remotes: {},
      })
    );
    await federationDev([], cliConfig, {
      config: configPath,
      dryRun: true,
      json: true,
      interactive: false,
    });
    expect(exitSpy).toHaveBeenCalledWith(0);
    const plan = stdoutDocs()[0];
    expect(plan.apps).toHaveLength(1);
    expect(plan.apps[0].port).toBe(8123);
    expect(plan.apps[0].root).toBe(tmpDir);
    expect(execaMock).not.toHaveBeenCalled();
  });

  it('a missing --config file exits 2 naming the resolved path', async () => {
    const missing = path.join(tmpDir, 'nope-federation.json');
    await federationDev([], cliConfig, {
      config: missing,
      dryRun: true,
      interactive: false,
    });
    expect(exitSpy).toHaveBeenCalledWith(2);
    expect(output()).toContain(missing);
    expect(execaMock).not.toHaveBeenCalled();
  });

  it('an invalid --config file exits 2 through the config-error path', async () => {
    const badPath = path.join(tmpDir, 'bad-federation.json');
    fs.writeFileSync(
      badPath,
      JSON.stringify({ host: { root: '.' }, remotes: {} })
    );
    await federationDev([], cliConfig, {
      config: badPath,
      dryRun: true,
      interactive: false,
    });
    expect(exitSpy).toHaveBeenCalledWith(2);
    expect(output()).toContain(badPath);
    expect(output()).toContain('host.manifest');
    expect(execaMock).not.toHaveBeenCalled();
  });
});

describe('federation-dev per-app react-native CLI resolution', () => {
  // The app installs are generated at runtime under os.tmpdir(): a fixture
  // node_modules/ tree is gitignored by definition, so a committed one
  // would be missing on CI and resolution would walk up to the repo's
  // REAL react-native, silently testing the wrong package.
  let rnFixtures: RnbinFixtures;
  let workspace: string;
  // The monorepo root's node_modules — what resolution walks UP to when an
  // app root has no install. No command may ever reference it.
  const repoNodeModules = path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    'node_modules'
  );

  const writeWorkspace = (name: string, miniRoot: string) => {
    const dir = path.join(rnFixtures.root, name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'repack-federation.json'),
      JSON.stringify({
        host: { manifest: './build/host/ios', root: '../app', port: 8091 },
        remotes: {
          MiniApp: {
            manifest: './build/mini/ios',
            root: miniRoot,
            port: 8092,
          },
        },
      })
    );
    return dir;
  };

  beforeAll(() => {
    rnFixtures = createRnbinFixtures();
  });

  afterAll(() => {
    rnFixtures.cleanup();
  });

  it('resolves each app CLI from its own root', async () => {
    // Threat-adjacent semantics: the CLI an app runs with is the one
    // installed in THAT app's root — the host's install never stands in
    // for a remote rooted elsewhere.
    workspace = writeWorkspace('split-roots', '../pnpmapp');
    process.chdir(workspace);
    await federationDev([], cliConfig, {
      dryRun: true,
      json: true,
      interactive: false,
    });
    const plan = stdoutDocs()[0];
    const host = plan.apps.find((app: { role: string }) => app.role === 'host');
    const mini = plan.apps.find(
      (app: { name: string }) => app.name === 'MiniApp'
    );
    const hostCli = path.join(
      rnFixtures.appRoot,
      'node_modules',
      'react-native',
      'cli.js'
    );
    expect(host.command).toContain(hostCli);
    // The pnpm app's CLI lives inside its own root — reached through the
    // symlink (realpath under node_modules/.pnpm) or, where symlinks are
    // unavailable, through a plain node_modules/react-native.
    const miniCliExpected = rnFixtures.pnpmFallbackDir
      ? path.join(rnFixtures.pnpmFallbackDir, 'scripts', 'cli.js')
      : rnFixtures.pnpmCliRealpath;
    expect(mini.command).toContain(miniCliExpected);
    expect(mini.command).not.toContain(hostCli);
    const miniCli = mini.command.split(' ')[1];
    expect(miniCli).not.toBe(hostCli);
    // CI-equivalence: nothing resolved to the repo's own install.
    expect(host.command).not.toContain(repoNodeModules);
    expect(mini.command).not.toContain(repoNodeModules);
    expect(execaMock).not.toHaveBeenCalled();
  });

  it('exits 2 naming the app whose own root lacks react-native', async () => {
    // No silent fall-back to the host's CLI: an app rooted where no
    // react-native resolves (the bare `noroot` fixture) is a usage error
    // naming that app. jest's own resolver never truly misses — it falls
    // back to the repo tree even with paths: [root] — so the miss is
    // driven through rnBin's documented requireResolve seam with a
    // Node-shaped MODULE_NOT_FOUND, mapping to the real CLIError. The
    // host still resolves for real, against its tmp fixture install.
    // realpath: the command anchors paths on process.cwd(), which realpaths
    // /var to /private/var on macOS — rnFixtures.root is already realpath'd.
    const miniRoot = rnFixtures.noRoot;
    // Capture the real implementation BEFORE the spy swaps the export:
    // jest.requireActual hands back the very object spyOn mutates.
    const realResolve = rnBin.resolveReactNativeBin;
    jest
      .spyOn(rnBin, 'resolveReactNativeBin')
      .mockImplementation((root: string, options?: unknown) => {
        if (root === miniRoot) {
          return realResolve(root, {
            requireResolve: () => {
              throw Object.assign(
                new Error("Cannot find module 'react-native/package.json'"),
                { code: 'MODULE_NOT_FOUND' }
              );
            },
          });
        }
        return realResolve(root, options as never);
      });
    workspace = writeWorkspace('missing-root', '../noroot');
    process.chdir(workspace);
    await federationDev([], cliConfig, {
      apps: 'MiniApp',
      dryRun: true,
      interactive: false,
    });
    expect(exitSpy).toHaveBeenCalledWith(2);
    expect(output()).toContain('MiniApp');
    expect(output()).toContain(miniRoot);
    expect(execaMock).not.toHaveBeenCalled();
  });
});

describe('federation-dev non-TTY defaults', () => {
  it('defaults the plan to host plus every declared remote without prompting', async () => {
    // jest's stdout is not a TTY: the wizard never runs; the default
    // session is host + all remotes (spec "Non-TTY default plan").
    await federationDev([], cliConfig, { dryRun: true });
    expect(exitSpy).toHaveBeenCalledWith(0);
    const text = output();
    expect(text).toContain('host');
    expect(text).toContain('MiniApp');
    expect(execaMock).not.toHaveBeenCalled();
  });
});

describe('federation-dev wizard gate', () => {
  let wizardSpy: jest.SpyInstance;
  const originalIsTTY = process.stdout.isTTY;

  beforeEach(() => {
    wizardSpy = jest
      .spyOn(wizard, 'runWizard')
      .mockResolvedValue({ status: 'cancelled' } as never);
  });

  afterEach(() => {
    process.stdout.isTTY = originalIsTTY;
  });

  it('never runs the wizard when stdout is not a TTY', async () => {
    process.stdout.isTTY = false;
    await federationDev([], cliConfig, { dryRun: true });
    expect(wizardSpy).not.toHaveBeenCalled();
  });

  it('runs the wizard on a TTY when neither --apps nor --no-interactive is given', async () => {
    process.stdout.isTTY = true;
    wizardSpy.mockResolvedValue({
      status: 'completed',
      answers: {
        session: { remotes: ['MiniApp'] },
        platform: undefined,
        ports: { host: 8099 },
      },
    });
    await federationDev([], cliConfig, { dryRun: true });
    expect(wizardSpy).toHaveBeenCalledTimes(1);
    // The answers drive the plan: the wizard's host port shows up.
    expect(output()).toContain('8099');
  });

  it('a cancelled wizard exits 0 without spawning', async () => {
    process.stdout.isTTY = true;
    await federationDev([], cliConfig, { dryRun: true });
    expect(wizardSpy).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(execaMock).not.toHaveBeenCalled();
  });

  it('--no-interactive suppresses the wizard even on a TTY', async () => {
    process.stdout.isTTY = true;
    await federationDev([], cliConfig, { dryRun: true, interactive: false });
    expect(wizardSpy).not.toHaveBeenCalled();
  });
});

describe('federation-dev live session', () => {
  let children: FakeChild[];
  let servers: http.Server[];
  let liveWorkspace: string;

  // OS-assigned free port when 0; resolves with the port actually bound.
  const startServer = (port: number) =>
    new Promise<number>((resolve, reject) => {
      const server = http.createServer((_req, res) => {
        // The readiness contract real dev servers answer on /status.
        res.writeHead(200, { 'content-type': 'text/plain' });
        res.end('packager-status:running');
      });
      server.once('error', reject);
      server.listen(port, () => {
        servers.push(server);
        resolve((server.address() as { port: number }).port);
      });
    });

  const waitFor = async (
    predicate: () => boolean,
    timeoutMs = 8000,
    describeState: () => string = () => ''
  ) => {
    const deadline = Date.now() + timeoutMs;
    while (!predicate()) {
      if (Date.now() > deadline)
        throw new Error(`waitFor timed out: ${describeState()}`);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  };

  beforeEach(() => {
    children = [];
    servers = [];
    liveWorkspace = '';
    execaMock.mockImplementation(() => {
      const child = new FakeChild();
      children.push(child);
      return child;
    });
  });

  afterEach(async () => {
    for (const child of children) child.emit('exit', 0, null);
    if (liveWorkspace)
      fs.rmSync(liveWorkspace, { recursive: true, force: true });
    await Promise.all(
      servers.map(
        (server) =>
          new Promise<void>((resolve) => {
            server.close(() => resolve());
            // Readiness pollers keep a socket pool warm; force-kill the
            // keep-alive handles so close() cannot hang the suite.
            server.closeAllConnections?.();
          })
      )
    );
  });

  it('spawns host + selected remote with the requested port, prints adb guidance, never runs adb itself', async () => {
    // No servers needed: the assertions cover spawn argv and guidance, and
    // a clean exit-0 ends the session whatever the readiness state.
    const command = federationDev([], cliConfig, {
      apps: 'MiniApp',
      platform: 'ios',
      port: 8090,
      interactive: false,
    });
    await waitFor(() => execaMock.mock.calls.length === 2);

    const spawnArgs = execaMock.mock.calls.map(
      (call) => (call as unknown as [string, string[]])[1]
    );
    expect(spawnArgs).toHaveLength(2);
    const hostArgs = spawnArgs.find((a) => a.includes('8090'));
    const remoteArgs = spawnArgs.find((a) => a.includes('8082'));
    expect(hostArgs).toBeDefined();
    expect(remoteArgs).toBeDefined();
    for (const args of spawnArgs) {
      expect(args).toContain('--no-interactive');
      // Threat row "adb execution": no adb ever rides the spawn mock.
      expect(args.join(' ')).not.toContain('adb');
    }
    // Host port goes through the audited runAdbReverse helper, once.
    expect(adbMock).toHaveBeenCalledTimes(1);
    expect(adbMock).toHaveBeenCalledWith(
      expect.objectContaining({ port: 8090 })
    );
    // Remote port is guidance for the developer, not an executed command.
    expect(output()).toContain('adb reverse tcp:8082 tcp:8082');
    // Platform guidance names the runnable command and the host port.
    expect(output()).toContain('run-ios');
    expect(output()).toContain('8090');

    for (const child of children) child.emit('exit', 0, null);
    await command;
    expect(exitSpy).toHaveBeenLastCalledWith(0);
  }, 20000);

  it('run guidance follows --platform android', async () => {
    const command = federationDev([], cliConfig, {
      apps: 'MiniApp',
      platform: 'android',
      interactive: false,
    });
    await waitFor(() => execaMock.mock.calls.length === 2);
    expect(output()).toContain('run-android');
    expect(output()).not.toContain('run-ios');
    for (const child of children) child.emit('exit', 0, null);
    await command;
  }, 20000);

  it('run guidance follows the wizard platform, not the absent flag', async () => {
    // Wizard answer overrides: no --platform flag, wizard picks android —
    // the printed line must say run-android (the plan, not args, is truth).
    const originalIsTTY = process.stdout.isTTY;
    process.stdout.isTTY = true;
    try {
      jest.spyOn(wizard, 'runWizard').mockResolvedValue({
        status: 'completed',
        answers: {
          session: { remotes: ['MiniApp'] },
          platform: 'android',
          ports: {},
        },
      } as never);
      // No --apps and no --no-interactive: the wizard gate is open on a TTY.
      const command = federationDev([], cliConfig, {});
      await waitFor(() => execaMock.mock.calls.length === 2);
      expect(output()).toContain('run-android');
      expect(output()).not.toContain('run-ios');
      for (const child of children) child.emit('exit', 0, null);
      await command;
    } finally {
      process.stdout.isTTY = originalIsTTY;
    }
  }, 20000);

  it('run guidance names both platforms when none is selected', async () => {
    const command = federationDev([], cliConfig, {
      apps: 'MiniApp',
      interactive: false,
    });
    await waitFor(() => execaMock.mock.calls.length === 2);
    expect(output()).toContain('run-ios');
    expect(output()).toContain('run-android');
    for (const child of children) child.emit('exit', 0, null);
    await command;
  }, 20000);

  it('--json live emits a parseable plan doc and status docs ending exited', async () => {
    // OS-assigned ports inside a workspace under the fixtures tree (so the
    // repo's react-native stays resolvable): well-known 8081/8082 may be
    // held by real dev servers on the developer's machine.
    const hostPort = await startServer(0);
    const remotePort = await startServer(0);
    liveWorkspace = fs.mkdtempSync(path.join(FIXTURES, 'live-'));
    fs.writeFileSync(
      path.join(liveWorkspace, 'repack-federation.json'),
      JSON.stringify({
        host: { manifest: './build/host', root: '.', port: hostPort },
        remotes: {
          MiniApp: { manifest: './build/mini', root: '.', port: remotePort },
        },
      })
    );
    process.chdir(liveWorkspace);

    const command = federationDev([], cliConfig, {
      apps: 'MiniApp',
      json: true,
      interactive: false,
    });
    await waitFor(() => execaMock.mock.calls.length === 2);
    const docsUpToRunning = () => stdoutDocs();
    await waitFor(
      () => {
        const docs = docsUpToRunning().filter((d) => d.event === 'status');
        return (
          docs.length > 0 &&
          docs[docs.length - 1].apps.every(
            (app: { status: string }) => app.status === 'running'
          )
        );
      },
      12000,
      () =>
        JSON.stringify({
          spawnCalls: execaMock.mock.calls.length,
          children: children.length,
          docs: docsUpToRunning().map((doc) => doc.event),
        })
    );
    for (const child of children) child.emit('exit', 0, null);
    await command;

    const docs = docsUpToRunning();
    expect(docs[0].event).toBe('plan');
    const finalDoc = docs[docs.length - 1];
    expect(finalDoc.event).toBe('status');
    expect(finalDoc.apps.map((app: { status: string }) => app.status)).toEqual([
      'exited',
      'exited',
    ]);
    expect(exitSpy).toHaveBeenLastCalledWith(0);
  }, 20000);

  it('exits 1 naming app and busy port without spawning or hanging', async () => {
    jest
      .spyOn(portPlanner, 'isPortBusy')
      .mockImplementation(async (port: number) => port === 8082);
    const command = federationDev([], cliConfig, {
      apps: 'MiniApp',
      interactive: false,
    });
    await expect(command).resolves.toBeUndefined();
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(output()).toContain('MiniApp');
    expect(output()).toContain('8082');
    expect(execaMock).not.toHaveBeenCalled();
  });

  it('human dry-run opens with the repack banner', async () => {
    await federationDev([], cliConfig, { dryRun: true });
    const text = output();
    expect(text).toContain('Re.Pack');
    expect(text).toContain(`v${packageJson.version}`);
    expect(text).toContain(
      'one supervised session for your module-federation workspace'
    );
    // The banner is context, not a replacement: the plan still prints.
    expect(text).toContain('PLAN');
  });

  it('--dry-run --json keeps the banner out of stdout', async () => {
    await federationDev([], cliConfig, { dryRun: true, json: true });
    const raw = stdoutSpy.mock.calls
      .map((call: unknown[]) => String(call[0]))
      .join('');
    expect(raw).not.toContain('Re.Pack');
    expect(raw).not.toContain('one supervised session');
    // stdout stays a pure JSON contract.
    expect(
      raw
        .trim()
        .split('\n')
        .every((line) => line.startsWith('{'))
    ).toBe(true);
  });

  it('--dry-run --json is byte-identical across runs and spawns nothing', async () => {
    await federationDev([], cliConfig, { dryRun: true, json: true });
    const firstRun = stdoutDocs();
    stdoutSpy.mockClear();
    await federationDev([], cliConfig, { dryRun: true, json: true });
    const secondRun = stdoutDocs();
    expect(secondRun).toEqual(firstRun);
    expect(firstRun[0]!.event).toBe('plan');
    expect(execaMock).not.toHaveBeenCalled();
  });

  describe('app launch (--launch / wizard yes)', () => {
    // Servers answer /status on OS-assigned ports so readiness happens for
    // real without touching well-known ports; the launch child itself is
    // the mocked execa — no device, no gradle, no xcode.
    const startLaunchWorkspace = () =>
      Promise.all([startServer(0), startServer(0)]).then(
        ([hostPort, remotePort]) => {
          liveWorkspace = fs.mkdtempSync(path.join(FIXTURES, 'launch-'));
          fs.writeFileSync(
            path.join(liveWorkspace, 'repack-federation.json'),
            JSON.stringify({
              host: { manifest: './build/host', root: '.', port: hostPort },
              remotes: {
                MiniApp: {
                  manifest: './build/mini',
                  root: '.',
                  port: remotePort,
                },
              },
            })
          );
          process.chdir(liveWorkspace);
          return { hostPort, remotePort };
        }
      );

    /** execa calls whose argv is an app-launch command, with child indexes. */
    const launchCalls = () =>
      execaMock.mock.calls
        .map((call, index) => ({
          argv: (
            call as unknown as [string, string[], Record<string, unknown>]
          )[1],
          index,
        }))
        .filter((entry) =>
          entry.argv.some((a) => /^run-(ios|android)$/.test(a))
        );

    it('--launch --platform android spawns run-android exactly once on first host readiness', async () => {
      const { hostPort } = await startLaunchWorkspace();
      const command = federationDev([], cliConfig, {
        apps: 'MiniApp',
        platform: 'android',
        launch: true,
        interactive: false,
      });
      await waitFor(
        () => launchCalls().length === 1,
        12000,
        () => `launch calls: ${launchCalls().length}`
      );
      const call = execaMock.mock.calls[launchCalls()[0]!.index] as unknown as [
        string,
        string[],
        Record<string, unknown>,
      ];
      // Same execa discipline as the supervisor's children.
      expect(call[0]).toBe(process.execPath);
      expect(call[1]).toEqual([
        expect.stringMatching(/react-native[\\/]cli\.js$/),
        'run-android',
        '--no-packager',
      ]);
      expect(call[2].cwd).toBe(fs.realpathSync(liveWorkspace));
      expect(call[2].shell).toBeFalsy();
      expect(call[2].stdin).toBe('ignore');
      // One-shot discipline: readiness keeps being observed (the remote
      // also flips running), yet the launch never respawns.
      await new Promise((resolve) => setTimeout(resolve, 1500));
      expect(launchCalls()).toHaveLength(1);
      // The launch reached the mocked child as a plain execa spawn; no
      // packager child (start) beyond host + MiniApp.
      const startCalls = execaMock.mock.calls.filter((c) =>
        (c as unknown as [string, string[]])[1].includes('start')
      );
      expect(startCalls).toHaveLength(2);
      expect(hostPort).toBeGreaterThan(0);
      for (const child of children) child.emit('exit', 0, null);
      await command;
      expect(exitSpy).toHaveBeenLastCalledWith(0);
    }, 30000);

    it('default without any launch flag never spawns a run command', async () => {
      await startLaunchWorkspace();
      const command = federationDev([], cliConfig, {
        apps: 'MiniApp',
        platform: 'android',
        interactive: false,
      });
      await waitFor(() => execaMock.mock.calls.length === 2);
      // Long enough for the first readiness tick to have fired.
      await new Promise((resolve) => setTimeout(resolve, 1200));
      expect(launchCalls()).toHaveLength(0);
      for (const child of children) child.emit('exit', 0, null);
      await command;
    }, 30000);

    it('a wizard "yes" drives the same launch without any launch flag', async () => {
      const { hostPort, remotePort } = await startLaunchWorkspace();
      const originalIsTTY = process.stdout.isTTY;
      process.stdout.isTTY = true;
      try {
        jest.spyOn(wizard, 'runWizard').mockResolvedValue({
          status: 'completed',
          answers: {
            session: { remotes: ['MiniApp'] },
            platform: 'android',
            launch: true,
            ports: { host: hostPort, MiniApp: remotePort },
          },
        } as never);
        const command = federationDev([], cliConfig, {});
        await waitFor(
          () => launchCalls().length === 1,
          12000,
          () => `launch calls: ${launchCalls().length}`
        );
        expect(launchCalls()[0]!.argv).toContain('run-android');
        for (const child of children) child.emit('exit', 0, null);
        await command;
      } finally {
        process.stdout.isTTY = originalIsTTY;
      }
    }, 30000);

    it('--launch with no narrowed platform exits 2 naming --platform, spawning nothing', async () => {
      await federationDev([], cliConfig, {
        apps: 'MiniApp',
        launch: true,
        interactive: false,
      });
      expect(exitSpy).toHaveBeenCalledWith(2);
      expect(output()).toContain('--platform');
      expect(execaMock).not.toHaveBeenCalled();
    });

    it('a failed launch streams through [launch] and never fails the session', async () => {
      await startLaunchWorkspace();
      const command = federationDev([], cliConfig, {
        apps: 'MiniApp',
        platform: 'android',
        launch: true,
        interactive: false,
      });
      await waitFor(() => launchCalls().length === 1);
      const launchIndex = launchCalls()[0]!.index;
      children[launchIndex]!.emit('exit', 1, null);
      // The dev servers are healthy: the user quitting ends the session 0
      // even though the launch child failed — servers own the exit code.
      for (const child of children) child.emit('exit', 0, null);
      await command;
      expect(output()).toContain('[launch] exited with code 1');
      expect(exitSpy).toHaveBeenLastCalledWith(0);
    }, 30000);

    it('shutdown kills an in-flight launch child with the session', async () => {
      await startLaunchWorkspace();
      const command = federationDev([], cliConfig, {
        apps: 'MiniApp',
        platform: 'android',
        launch: true,
        interactive: false,
      });
      await waitFor(() => launchCalls().length === 1);
      const launchChild = children[launchCalls()[0]!.index]!;
      // One Ctrl-C: the supervisor's ordered shutdown covers the launch too.
      process.emit('SIGINT');
      expect(launchChild.kill).toHaveBeenCalledWith('SIGINT');
      for (const child of children) child.emit('exit', 0, null);
      await command;
      expect(exitSpy).toHaveBeenLastCalledWith(0);
    }, 30000);
  });
});
