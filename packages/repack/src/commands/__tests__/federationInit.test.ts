import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { federationInit } from '../federationInit.js';
import type { CliConfig } from '../types.js';

// The command builds its prompts through createReadlineAsk(); tests route
// that channel through a queued stub.
jest.mock('../federation/init/prompt.js', () => {
  const actual = jest.requireActual('../federation/init/prompt.js');
  return {
    ...actual,
    createReadlineAsk: () => (question: string) =>
      ((globalThis as any).__repackInitAsk ?? (async () => ''))(question),
  };
});

const FIXTURE = path.join(
  __dirname,
  '..',
  'federation',
  '__fixtures__',
  'init-workspace'
);

const cliConfigFor = (root: string): CliConfig => ({
  root,
  platforms: ['ios'],
  reactNativePath: '/project/node_modules/react-native',
});

function copyWorkspace(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'repack-init-cmd-'));
  fs.cpSync(FIXTURE, dir, { recursive: true });
  return dir;
}

function hashTree(dir: string): Map<string, string> {
  const files = new Map<string, string>();
  const walk = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else files.set(full, fs.readFileSync(full, 'utf-8'));
    }
  };
  walk(dir);
  return files;
}

function queuedAsk(answers: string[]) {
  let index = 0;
  (globalThis as any).__repackInitAsk = async () => answers[index++] ?? '';
}

let root: string;
let log: jest.SpyInstance;
let error: jest.SpyInstance;
let exit: jest.SpyInstance;

beforeEach(() => {
  root = copyWorkspace();
  log = jest.spyOn(console, 'log').mockImplementation(() => {});
  error = jest.spyOn(console, 'error').mockImplementation(() => {});
  exit = jest
    .spyOn(process, 'exit')
    .mockImplementation(
      (() => undefined) as (code?: string | number | null) => never
    );
});

afterEach(() => {
  delete (globalThis as any).__repackInitAsk;
  jest.restoreAllMocks();
  fs.rmSync(root, { recursive: true, force: true });
});

function stdout(): string {
  return log.mock.calls.map(([line]) => String(line)).join('\n');
}

function stderr(): string {
  return error.mock.calls.map(([line]) => String(line)).join('\n');
}

describe('federation-init refusals — exit 2, clear message, no writes', () => {
  it('refuses --standalone for a targeted remote that does not declare it, writing nothing', async () => {
    const before = hashTree(root);
    await federationInit(
      [path.join(root, 'features', 'store')],
      cliConfigFor(root),
      {
        name: 'remote-drift',
        standalone: true,
      }
    );

    expect(stderr()).toContain(
      '--standalone refused: remote "remote-drift" does not declare standalone support'
    );
    expect(exit).toHaveBeenCalledWith(2);
    expect(hashTree(root)).toEqual(before);
  });

  it('treats a non-string argv[0] (commander options object) as no folder given', async () => {
    // RN CLI >= 17 passes the parsed options object as argv[0] whenever no
    // positional was captured; path.resolve must never receive it.
    const before = hashTree(root);
    await federationInit(
      [{ name: 'store' }] as unknown as string[],
      cliConfigFor(root),
      { name: 'store' }
    );

    expect(stderr()).toContain('No feature folder given');
    expect(exit).toHaveBeenCalledWith(2);
    expect(hashTree(root)).toEqual(before);
  });

  it('requires --name', async () => {
    await federationInit(
      [path.join(root, 'features', 'store')],
      cliConfigFor(root),
      {}
    );

    expect(stderr()).toContain('--name');
    expect(exit).toHaveBeenCalledWith(2);
  });

  it('refuses a missing feature folder', async () => {
    await federationInit(
      [path.join(root, 'features', 'nope')],
      cliConfigFor(root),
      {
        name: 'store',
      }
    );

    expect(stderr()).toContain('feature folder');
    expect(exit).toHaveBeenCalledWith(2);
  });

  it('requires a repack-federation.json workspace', async () => {
    fs.rmSync(path.join(root, 'repack-federation.json'));
    await federationInit(
      [path.join(root, 'features', 'store')],
      cliConfigFor(root),
      {
        name: 'store',
      }
    );

    expect(stderr()).toContain('repack-federation.json');
    expect(exit).toHaveBeenCalledWith(2);
  });

  it('prints no stack for a malformed workspace config', async () => {
    fs.writeFileSync(path.join(root, 'repack-federation.json'), '{ nope');
    await federationInit(
      [path.join(root, 'features', 'store')],
      cliConfigFor(root),
      {
        name: 'store',
      }
    );

    expect(stderr()).toContain('Federation config');
    expect(stderr()).not.toContain('    at ');
    expect(exit).toHaveBeenCalledWith(2);
  });

  it('aborts under --yes when required manual steps remain instead of silently skipping', async () => {
    // A duck-typed plugin the version regex cannot name: extraction works,
    // the remotes surgery refuses to guess — --yes must abort.
    fs.writeFileSync(
      path.join(root, 'apps', 'host', 'rspack.config.js'),
      `class MyFederationPlugin {
  constructor(config) { this.config = config; }
  getSharedConfiguration() { return this.config.shared; }
}
module.exports = () => ({
  plugins: [new MyFederationPlugin({ name: 'HostApp', shared: { react: {} } })],
});
`
    );
    const before = hashTree(root);

    await federationInit(
      [path.join(root, 'features', 'store')],
      cliConfigFor(root),
      {
        name: 'store',
        yes: true,
      }
    );

    expect(stderr()).toContain('manual');
    expect(exit).toHaveBeenCalledWith(2);
    expect(hashTree(root)).toEqual(before);
  });
});

describe('federation-init --yes', () => {
  it('scaffolds all surfaces, auto-aligns divergence and reports old→new pins', async () => {
    await federationInit(
      [path.join(root, 'features', 'store')],
      cliConfigFor(root),
      {
        name: 'store',
        yes: true,
      }
    );

    expect(exit).not.toHaveBeenCalled();
    expect(
      fs.existsSync(path.join(root, 'remotes', 'store', 'rspack.store.mts'))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(root, 'remotes', 'store', 'webpack.store.mts'))
    ).toBe(true);

    const map = JSON.parse(
      fs.readFileSync(path.join(root, 'repack-federation.json'), 'utf-8')
    ) as { remotes: Record<string, object> };
    expect(map.remotes.store).toEqual({
      manifest: 'remotes/store/build',
      root: 'remotes/store',
    });
    expect(
      fs.readFileSync(
        path.join(root, 'apps', 'host', 'rspack.config.js'),
        'utf-8'
      )
    ).toContain("'store': 'store@store/remoteEntry.js'");

    const out = stdout();
    expect(out).toContain('react: ^9.8.7 → 9.9.9');
    expect(out).toMatch(/run your package manager install/i);
  });

  it('re-running with --yes is a no-op on an already-scaffolded remote', async () => {
    await federationInit(
      [path.join(root, 'features', 'store')],
      cliConfigFor(root),
      {
        name: 'store',
        yes: true,
      }
    );
    const afterFirst = hashTree(root);
    log.mockClear();
    exit.mockClear();

    await federationInit(
      [path.join(root, 'features', 'store')],
      cliConfigFor(root),
      {
        name: 'store',
        yes: true,
      }
    );

    expect(stdout()).toContain('Nothing to do');
    expect(exit).not.toHaveBeenCalled();
    expect(hashTree(root)).toEqual(afterFirst);
  });
});

describe('federation-init interactive gate', () => {
  it('cancels everything on [c] at the divergence prompt, writing nothing', async () => {
    const before = hashTree(root);
    queuedAsk(['c']);

    await federationInit(
      [path.join(root, 'features', 'store')],
      cliConfigFor(root),
      {
        name: 'store',
      }
    );

    expect(exit).toHaveBeenCalledWith(1);
    expect(hashTree(root)).toEqual(before);
  });

  it('writes nothing when the apply prompt is declined', async () => {
    const before = hashTree(root);
    queuedAsk(['i', 'n']); // ignore divergence, then decline the diffs

    await federationInit(
      [path.join(root, 'features', 'store')],
      cliConfigFor(root),
      {
        name: 'store',
      }
    );

    expect(stdout()).toContain('Declined');
    expect(exit).not.toHaveBeenCalledWith(2);
    expect(hashTree(root)).toEqual(before);
  });

  it('applies after [i]gnore then y, and the plan diff was printed first', async () => {
    queuedAsk(['i', 'y']);

    await federationInit(
      [path.join(root, 'features', 'store')],
      cliConfigFor(root),
      {
        name: 'store',
      }
    );

    // The divergence was shown before the prompt, side-by-side style.
    expect(stdout()).toContain('react: remote 9.8.7 vs host 9.9.9');
    // The diffs were shown pre-confirm.
    expect(stdout()).toContain('remotes/store/package.json');
    expect(
      fs.existsSync(path.join(root, 'remotes', 'store', 'rspack.store.mts'))
    ).toBe(true);
    // Ignore means the divergent remote was NOT rewritten.
    expect(
      fs.readFileSync(
        path.join(root, 'apps', 'remote-drift', 'package.json'),
        'utf-8'
      )
    ).toContain('"^9.8.7"');
  });
});
