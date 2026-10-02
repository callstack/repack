import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CLIError } from '../../../helpers/index.js';
import {
  assertStandaloneSupported,
  ConfigFileInvalidError,
  describeJsonParseFailure,
  FEDERATION_CONFIG_FILENAME,
  findConfigPath,
  loadFederationConfig,
  resolveFederationWorkspace,
  validateFederationConfig,
} from '../configFile.js';

const FIXTURES = path.join(__dirname, '__fixtures__');
const VALID_DIR = path.join(FIXTURES, 'config-valid');
const URL_DIR = path.join(FIXTURES, 'config-url');
const WALKUP_DIR = path.join(FIXTURES, 'config-walkup');

let tmpDir: string;
// Truncated JSON built at runtime: a committed invalid .json would break the
// repo-wide biome check (same pattern as the corrupt-remote tmp fixture).
let malformedDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repack-config-'));
  malformedDir = path.join(tmpDir, 'config-malformed');
  fs.mkdirSync(malformedDir);
  fs.writeFileSync(
    path.join(malformedDir, FEDERATION_CONFIG_FILENAME),
    '{ "host": { "manifest":\n'
  );
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('validateFederationConfig', () => {
  it('accepts the minimal document', () => {
    expect(
      validateFederationConfig({
        host: { manifest: './shell/build' },
        remotes: { store: { manifest: 'http://localhost:8082' } },
      })
    ).toEqual([]);
  });

  it('accepts the full document with every optional field', () => {
    expect(
      validateFederationConfig({
        host: { manifest: './shell/build', root: '.' },
        remotes: {
          store: {
            manifest: './store/build',
            root: './apps/store',
            standalone: true,
            port: 8082,
          },
        },
      })
    ).toEqual([]);
  });

  it('rejects an unknown top-level key naming its path', () => {
    expect(
      validateFederationConfig({
        host: { manifest: '.' },
        remotes: {},
        bogus: true,
      })
    ).toEqual(['bogus is not a known field']);
  });

  it('rejects unknown nested keys naming the full field path', () => {
    expect(
      validateFederationConfig({
        host: { manifest: '.', bogus: 1 },
        remotes: { store: { manifest: '.', bogus: 2 } },
      })
    ).toEqual([
      'host.bogus is not a known field',
      'remotes.store.bogus is not a known field',
    ]);
  });

  it('names the field path for every schema violation', () => {
    expect(
      validateFederationConfig({ host: { root: '.' }, remotes: {} })
    ).toEqual(['host.manifest is required (string)']);
    expect(
      validateFederationConfig({
        host: { manifest: '.' },
        remotes: { store: { manifest: '.', standalone: 'yes' } },
      })
    ).toEqual(['remotes.store.standalone must be a boolean']);
    expect(
      validateFederationConfig({
        host: { manifest: 42 },
        remotes: {},
      })
    ).toEqual(['host.manifest is required (string)']);
    expect(
      validateFederationConfig({
        host: { manifest: '.' },
        remotes: { store: {} },
      })
    ).toEqual(['remotes.store.manifest is required (string)']);
    expect(
      validateFederationConfig({
        host: { manifest: '.' },
        remotes: { store: { manifest: '.', port: '8082' } },
      })
    ).toEqual(['remotes.store.port must be a number']);
  });

  it('rejects remotes as an array', () => {
    expect(
      validateFederationConfig({
        host: { manifest: '.' },
        remotes: [{ manifest: '.' }],
      })
    ).toEqual(['remotes must be a name-keyed object, not an array']);
  });
});

describe('findConfigPath', () => {
  it('finds the file in the given directory', () => {
    expect(findConfigPath(VALID_DIR)).toBe(
      path.join(VALID_DIR, FEDERATION_CONFIG_FILENAME)
    );
  });

  it('walks up from a nested directory', () => {
    expect(findConfigPath(path.join(VALID_DIR, 'apps', 'store'))).toBe(
      path.join(VALID_DIR, FEDERATION_CONFIG_FILENAME)
    );
  });

  it('takes the first hit walking up', () => {
    expect(findConfigPath(path.join(WALKUP_DIR, 'nested'))).toBe(
      path.join(WALKUP_DIR, 'nested', FEDERATION_CONFIG_FILENAME)
    );
  });

  it('returns null when nothing exists up the tree', () => {
    const isolated = path.join(tmpDir, 'deep', 'nested');
    fs.mkdirSync(isolated, { recursive: true });
    expect(findConfigPath(isolated)).toBeNull();
  });
});

describe('loadFederationConfig', () => {
  it('loads a valid document preserving optional fields', () => {
    const loaded = loadFederationConfig({ cwd: VALID_DIR });
    expect(loaded).not.toBeNull();
    expect(loaded!.filePath).toBe(
      path.join(VALID_DIR, FEDERATION_CONFIG_FILENAME)
    );
    expect(loaded!.config.remotes.store).toEqual({
      manifest: './manifests/store.json',
      root: './apps/store',
      standalone: true,
      port: 8082,
    });
  });

  it('rejects malformed JSON naming the file and never a stack', () => {
    let caught: unknown;
    try {
      loadFederationConfig({ cwd: malformedDir });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ConfigFileInvalidError);
    const error = caught as ConfigFileInvalidError;
    expect(error.filePath).toBe(
      path.join(malformedDir, FEDERATION_CONFIG_FILENAME)
    );
    expect(error.reasons).toHaveLength(1);
    expect(error.reasons[0]).toContain('is not valid JSON');
    // The reason the command layer prints is a single clean line — it never
    // carries a stack trace (the command-level test pins the output).
    expect(error.reasons[0]).not.toMatch(/\n\s+at\s/);
  });

  it('enriches parse failures with line/column when a position is available', () => {
    const raw = `{\n  "host": \n}\n`;
    // V8-style position-bearing message (older V8): line/column derived —
    // byte 13 is the `}`, first character of line 3.
    expect(
      describeJsonParseFailure(
        raw,
        new SyntaxError('Unexpected token } in JSON at position 13')
      )
    ).toBe(
      'is not valid JSON: Unexpected token } in JSON at position 13 (line 3, column 1)'
    );
    // Newer V8 exposes no position — the message rides verbatim.
    expect(
      describeJsonParseFailure(
        raw,
        new SyntaxError('Unexpected token } in some recent V8')
      )
    ).toBe('is not valid JSON: Unexpected token } in some recent V8');
  });

  it('rejects schema violations with the exact field-path reasons', () => {
    expect(() =>
      loadFederationConfig({ cwd: path.join(FIXTURES, 'config-invalid') })
    ).toThrow(ConfigFileInvalidError);
    try {
      loadFederationConfig({ cwd: path.join(FIXTURES, 'config-invalid') });
    } catch (error) {
      expect((error as ConfigFileInvalidError).reasons).toEqual([
        'host.manifest is required (string)',
      ]);
    }
  });

  it('returns null with nothing to load (never throws)', () => {
    const isolated = path.join(tmpDir, 'empty');
    fs.mkdirSync(isolated, { recursive: true });
    expect(loadFederationConfig({ cwd: isolated })).toBeNull();
  });
});

describe('resolveFederationWorkspace', () => {
  it('reports source none without flags or file', () => {
    const isolated = path.join(tmpDir, 'no-ws');
    fs.mkdirSync(isolated, { recursive: true });
    const ws = resolveFederationWorkspace(isolated, {});
    expect(ws).toEqual({ remotes: [], source: 'none' });
  });

  it('resolves file values against the config directory, not cwd', () => {
    const ws = resolveFederationWorkspace(path.join(VALID_DIR, 'deep', 'dir'), {
      /* cwd deep inside: values still anchor at the config dir */
    });
    expect(ws.source).toBe('file');
    expect(ws.configPath).toBe(
      path.join(VALID_DIR, FEDERATION_CONFIG_FILENAME)
    );
    expect(ws.host).toEqual({
      source: path.join(VALID_DIR, 'manifests', 'host.json'),
      root: VALID_DIR,
    });
    expect(ws.remotes).toEqual([
      {
        name: 'store',
        source: path.join(VALID_DIR, 'manifests', 'store.json'),
        root: path.join(VALID_DIR, 'apps', 'store'),
        standalone: true,
        port: 8082,
      },
    ]);
  });

  it('keeps benign path values under the config dir (path-traversal boundary)', () => {
    const ws = resolveFederationWorkspace(VALID_DIR, {});
    for (const source of [
      ws.host!.source,
      ...ws.remotes.map((remote) => remote.source),
    ]) {
      expect(source.startsWith(VALID_DIR + path.sep)).toBe(true);
    }
  });

  it('keeps http(s) manifest sources verbatim instead of path-resolving them', () => {
    const ws = resolveFederationWorkspace(URL_DIR, {});
    expect(ws.remotes[0]!.source).toBe('http://localhost:8082');
  });

  it('applies per-value precedence: --host overrides only the host', () => {
    const ws = resolveFederationWorkspace(VALID_DIR, {
      host: '/tmp/other/build',
    });
    expect(ws.source).toBe('mixed');
    expect(ws.host).toEqual({ source: '/tmp/other/build' });
    // The remaining values still come from the file.
    expect(ws.remotes[0]!.name).toBe('store');
    expect(ws.remotes[0]!.source).toBe(
      path.join(VALID_DIR, 'manifests', 'store.json')
    );
  });

  it('replaces the remote set wholesale when --remotes is passed', () => {
    const ws = resolveFederationWorkspace(VALID_DIR, {
      remotes: 'http://one,http://two',
    });
    expect(ws.source).toBe('mixed');
    expect(ws.remotes).toEqual([
      { source: 'http://one' },
      { source: 'http://two' },
    ]);
    // host still from the file
    expect(ws.host!.source).toBe(
      path.join(VALID_DIR, 'manifests', 'host.json')
    );
  });

  it('reports source flags when both values come from flags', () => {
    const ws = resolveFederationWorkspace(VALID_DIR, {
      host: './h',
      remotes: './r1,./r2',
    });
    expect(ws.source).toBe('flags');
    expect(ws.host).toEqual({ source: './h' });
    expect(ws.remotes).toHaveLength(2);
  });

  it('treats port presence as behavior-neutral data', () => {
    const withPort = resolveFederationWorkspace(VALID_DIR, {});
    const withoutPort = resolveFederationWorkspace(
      path.join(FIXTURES, 'config-noport'),
      {}
    );
    // Same workspace shape minus the declared-but-unconsumed port.
    expect(withoutPort.remotes).toEqual([
      {
        name: 'store',
        source: path.join(FIXTURES, 'config-noport', 'manifests', 'store.json'),
      },
    ]);
    expect(withPort.host!.source.endsWith('host.json')).toBe(
      withoutPort.host!.source.endsWith('host.json')
    );
  });
});

describe('assertStandaloneSupported', () => {
  const STANDALONE_DIR = path.join(FIXTURES, 'config-standalone');
  const appRoot = (name: string) => path.join(STANDALONE_DIR, 'apps', name);

  it('proceeds for an entry that declares standalone: true', () => {
    expect(() => assertStandaloneSupported(appRoot('supported'))).not.toThrow();
  });

  it('refuses an entry with no standalone declaration, naming remote + file + fix', () => {
    expect(() => assertStandaloneSupported(appRoot('undeclared'))).toThrow(
      '--standalone refused: remote "undeclared" does not declare ' +
        'standalone support. Set "standalone": true for it in ' +
        path.join(STANDALONE_DIR, FEDERATION_CONFIG_FILENAME) +
        '.'
    );
  });

  it('treats standalone: false as unsupported', () => {
    expect(() => assertStandaloneSupported(appRoot('declined'))).toThrow(
      'remote "declined" does not declare standalone support'
    );
  });

  it('defaults an entry with no root to the config directory itself', () => {
    expect(() =>
      assertStandaloneSupported(
        path.join(FIXTURES, 'config-standalone-default')
      )
    ).toThrow('remote "default-root" does not declare standalone support');
  });

  it('proceeds when the root matches no remote entry (e.g. the host)', () => {
    // The host runs standalone without any declaration; host.root "." equals
    // the config dir here, and no REMOTE entry matches it in config-valid.
    expect(() => assertStandaloneSupported(VALID_DIR)).not.toThrow();
  });

  it('proceeds with no config file at all (no declaration needed to work)', () => {
    const isolated = path.join(tmpDir, 'standalone-nocfg');
    fs.mkdirSync(isolated, { recursive: true });
    expect(() => assertStandaloneSupported(isolated)).not.toThrow();
  });

  it('refuses with a clear CLIError when the config file is malformed', () => {
    let caught: unknown;
    try {
      assertStandaloneSupported(malformedDir);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(CLIError);
    const message = (caught as Error).message;
    expect(message).toContain('--standalone refused');
    expect(message).toContain(
      path.join(malformedDir, FEDERATION_CONFIG_FILENAME)
    );
    expect(message).not.toMatch(/\n\s+at\s/);
  });
});
