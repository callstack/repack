import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CLIError } from '../../../helpers/index.js';
import { loadFederationConfig } from '../configFile.js';
import { buildPlan } from '../devPlan.js';

const FIXTURES = path.join(__dirname, '__fixtures__');
const TWIN_DIR = path.join(FIXTURES, 'config-dev-twin');
const TWIN_CONFIG = path.join(TWIN_DIR, 'repack-federation.json');
const RN_CLI = '/abs/node_modules/react-native/cli.js';

const twinLoaded = loadFederationConfig({ cwd: TWIN_DIR })!;

const baseInput = () => ({
  configPath: TWIN_CONFIG,
  config: twinLoaded.config,
  session: { remotes: ['MiniApp'] },
  overrides: {},
  ports: {},
  rnCliForRoot: () => RN_CLI,
});

describe('buildPlan session set and ordering', () => {
  it('plans the host first and remotes in file declaration order', () => {
    const plan = buildPlan(baseInput());
    expect(plan.map((app) => app.name)).toEqual(['host', 'MiniApp']);
    expect(plan[0]!.role).toBe('host');
    expect(plan[1]!.role).toBe('remote');
  });

  it('keeps file order with several remotes and filters unselected ones', () => {
    const plan = buildPlan({
      ...baseInput(),
      config: {
        host: { manifest: '.' },
        remotes: {
          zeta: { manifest: '.' },
          alpha: { manifest: '.' },
          unselected: { manifest: '.' },
        },
      },
      session: { remotes: ['zeta', 'alpha'] },
    });
    expect(plan.map((app) => app.name)).toEqual(['host', 'zeta', 'alpha']);
  });

  it('includes a standalone remote even when --apps omitted it', () => {
    const plan = buildPlan({
      ...baseInput(),
      session: { remotes: [], standaloneRemote: 'MiniApp' },
    });
    expect(plan.map((app) => app.name)).toEqual(['host', 'MiniApp']);
  });

  it('refuses an unknown session name (e.g. --apps --no-interactive) and plans nothing for it', () => {
    // Threat row "Subprocess spawn": a flag-shaped --apps value is an
    // unknown remote name — the plan layer refuses it (the command maps
    // this to exit 2), so it can never reach a spawn argv as a name.
    let caught: unknown;
    try {
      buildPlan({ ...baseInput(), session: { remotes: ['--no-interactive'] } });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(CLIError);
    expect((caught as Error).message).toContain('--no-interactive');
  });
});

describe('buildPlan port and config precedence', () => {
  it('applies --port > host port field > 8081 for the host', () => {
    // Twin host declares port 8081; the flag wins over the file…
    const flagged = buildPlan({
      ...baseInput(),
      overrides: { port: 9000 },
    });
    expect(flagged[0]!.port).toBe(9000);
    // …and the declared field wins over the default.
    const declared = buildPlan(baseInput());
    expect(declared[0]!.port).toBe(8081);
    // No flag, no declaration ⇒ built-in default.
    const defaulted = buildPlan({
      ...baseInput(),
      config: { host: { manifest: '.' }, remotes: {} },
      session: { remotes: [] },
    });
    expect(defaulted[0]!.port).toBe(8081);
  });

  it('lets the port planner override declared values (auto-ports reassignment)', () => {
    const plan = buildPlan({ ...baseInput(), ports: { MiniApp: 9321 } });
    expect(plan[1]!.port).toBe(9321);
  });

  it('routes each declared config to its own app and sets absolute spawn cwd', () => {
    const plan = buildPlan(baseInput());
    expect(plan[0]!.config).toBe(path.join(TWIN_DIR, 'config.host-app.mts'));
    expect(plan[1]!.config).toBe(path.join(TWIN_DIR, 'config.mini-app.mts'));
    for (const app of plan) {
      expect(app.spawn.cwd).toBe(TWIN_DIR);
      expect(path.isAbsolute(app.spawn.cwd)).toBe(true);
    }
  });

  it('omits --config entirely when the app declares none', () => {
    const plan = buildPlan({
      ...baseInput(),
      config: { host: { manifest: '.' }, remotes: {} },
      session: { remotes: [] },
    });
    expect(plan[0]!.config).toBeUndefined();
    expect(plan[0]!.spawn.args).not.toContain('--config');
  });

  it('lets a per-run config choice override the declared field', () => {
    const plan = buildPlan({
      ...baseInput(),
      overrides: { configChoices: { MiniApp: '/run/choices/mini.mts' } },
    });
    expect(plan[1]!.config).toBe('/run/choices/mini.mts');
  });
});

describe('buildPlan spawn shape', () => {
  it('spawns process.execPath with the rn cli and the unified start command', () => {
    const plan = buildPlan(baseInput());
    for (const app of plan) {
      expect(app.spawn.file).toBe(process.execPath);
      expect(app.spawn.args.slice(0, 4)).toEqual([
        RN_CLI,
        'start',
        '--bundler',
        // Twin configs are `config.*.mts` — no engine prefix, no conventional
        // config in the app dir ⇒ detectBundler's rspack default.
        'rspack',
      ]);
      expect(app.spawn.args).toContain('--no-interactive');
      expect(app.spawn.args).toContain('--no-reverse-port');
    }
  });

  it('forwards --platform to every child only when selected', () => {
    const withPlatform = buildPlan({
      ...baseInput(),
      overrides: { platform: 'ios' },
    });
    for (const app of withPlatform) {
      const index = app.spawn.args.indexOf('--platform');
      expect(index).toBeGreaterThan(-1);
      expect(app.spawn.args[index + 1]).toBe('ios');
    }
    const without = buildPlan(baseInput());
    for (const app of without) {
      expect(app.spawn.args).not.toContain('--platform');
    }
  });

  it('puts --standalone only on the targeted remote, never the host', () => {
    const plan = buildPlan({
      ...baseInput(),
      session: { remotes: ['MiniApp'], standaloneRemote: 'MiniApp' },
    });
    expect(plan[0]!.spawn.args).not.toContain('--standalone');
    expect(plan[1]!.spawn.args).toContain('--standalone');
  });

  it('resolves the bundler per app from the resolved config name', () => {
    const plan = buildPlan({
      ...baseInput(),
      overrides: { configChoices: { MiniApp: '/abs/webpack.mini.mts' } },
    });
    expect(plan[1]!.bundler).toBe('webpack');
    expect(plan[1]!.spawn.args[3]).toBe('webpack');
  });

  it('renders commandLine from the exact argv and quotes hostile values', () => {
    const plan = buildPlan(baseInput());
    const host = plan[0]!;
    const argv = [host.spawn.file, ...host.spawn.args];
    expect(host.commandLine).toBe(
      argv.map((part) => (/\s/.test(part) ? `"${part}"` : part)).join(' ')
    );
    expect(host.commandLine).toContain('--port 8081');
  });

  it('keeps hostile-but-valid names and metachar config paths as exact argv entries with no shell field', () => {
    // Threat row "Subprocess spawn": hostile strings must ride the argv
    // array verbatim; nothing in the plan may ask for a shell.
    const plan = buildPlan({
      ...baseInput(),
      config: {
        host: { manifest: '.' },
        remotes: {
          'evil name\'s "twin"': {
            manifest: '.',
            config: 'config $(rm -rf /); echo .mts',
            port: 8099,
          },
        },
      },
      session: { remotes: ['evil name\'s "twin"'] },
    });
    const evil = plan[1]!;
    expect(evil.name).toBe('evil name\'s "twin"');
    expect(evil.spawn.args).toContain(
      path.resolve(path.dirname(TWIN_CONFIG), 'config $(rm -rf /); echo .mts')
    );
    expect(evil.spawn.file).toBe(process.execPath);
    expect(JSON.stringify(plan)).not.toContain('"shell"');
    // The display render quotes the metachar path — it never interpolates it.
    expect(evil.commandLine).toContain(
      `"${path.resolve(path.dirname(TWIN_CONFIG), 'config $(rm -rf /); echo .mts')}"`
    );
  });
});

describe('buildPlan cwd authority', () => {
  it('resolves spawn.cwd against the config file directory from a nested cwd', () => {
    // Threat row "Process cwd authority": the runner may be invoked from
    // anywhere; the plan's paths anchor at the config file, not process.cwd.
    const nested = fs.mkdtempSync(path.join(os.tmpdir(), 'devplan-cwd-'));
    const previousCwd = process.cwd();
    process.chdir(nested);
    try {
      const loaded = loadFederationConfig({
        cwd: path.join(TWIN_DIR, 'deep', 'nested'),
      })!;
      const plan = buildPlan({
        ...baseInput(),
        configPath: loaded.filePath,
        config: loaded.config,
      });
      for (const app of plan) {
        expect(app.spawn.cwd).toBe(TWIN_DIR);
      }
    } finally {
      process.chdir(previousCwd);
      fs.rmSync(nested, { recursive: true, force: true });
    }
  });
});

describe('buildPlan auto-port display (dry-run discipline)', () => {
  it('maps an auto port to undefined with --port <auto> in the command', () => {
    const plan = buildPlan({
      ...baseInput(),
      config: {
        host: { manifest: '.' },
        remotes: { floater: { manifest: '.', root: '.' } },
      },
      session: { remotes: ['floater'] },
      ports: { floater: 'auto' },
    });
    const floater = plan[1]!;
    expect(floater.port).toBeUndefined();
    expect(floater.commandLine).toContain('--port <auto>');
    expect(floater.url).toBe('http://localhost:<auto>');
  });
});
