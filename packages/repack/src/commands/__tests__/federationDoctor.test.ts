import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { federationDoctor } from '../federationDoctor.js';
import type { CliConfig } from '../types.js';

const FIXTURES = path.join(
  __dirname,
  '..',
  'federation',
  '__tests__',
  '__fixtures__'
);
const HOST_FILE = path.join(FIXTURES, 'host.json');
const CLEAN_REMOTE = path.join(FIXTURES, 'remote-clean.json');
const DRIFT_REMOTE = path.join(FIXTURES, 'remote-conflicting.json');

const cliConfig: CliConfig = {
  root: '/project',
  platforms: ['ios'],
  reactNativePath: '/project/node_modules/react-native',
};

let tmpDir: string;
let invalidRemote: string;
let log: jest.SpyInstance;
let error: jest.SpyInstance;
let exit: jest.SpyInstance;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repack-doctor-cmd-'));
  invalidRemote = path.join(tmpDir, 'invalid.json');
  fs.writeFileSync(invalidRemote, 'not json at all');
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

beforeEach(() => {
  log = jest.spyOn(console, 'log').mockImplementation(() => {});
  error = jest.spyOn(console, 'error').mockImplementation(() => {});
  exit = jest
    .spyOn(process, 'exit')
    .mockImplementation(
      (() => undefined) as (code?: string | number | null) => never
    );
});

function stdout(): string {
  return log.mock.calls.map(([line]) => String(line)).join('\n');
}

describe('federation-doctor command', () => {
  it('exits 0 and prints a clean report when nothing drifts', async () => {
    await federationDoctor([], cliConfig, {
      host: HOST_FILE,
      remotes: CLEAN_REMOTE,
    });

    expect(stdout()).toContain('no issues found');
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('exits 1 and names the drift for a conflicting remote', async () => {
    await federationDoctor([], cliConfig, {
      host: HOST_FILE,
      remotes: DRIFT_REMOTE,
    });

    expect(stdout()).toContain('SHARED_VERSION_DRIFT');
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('exits 2 when the host manifest is missing', async () => {
    await federationDoctor([], cliConfig, {
      host: path.join(tmpDir, 'no-host.json'),
      remotes: CLEAN_REMOTE,
    });

    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('Host manifest')
    );
    expect(exit).toHaveBeenCalledWith(2);
  });

  it('exits 2 when a remote manifest exists but is corrupt', async () => {
    await federationDoctor([], cliConfig, {
      host: HOST_FILE,
      remotes: invalidRemote,
    });

    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('cannot be trusted')
    );
    expect(exit).toHaveBeenCalledWith(2);
    expect(log).not.toHaveBeenCalled();
  });

  it('exits 1 for a missing remote manifest, 0 with --allow-missing-manifests', async () => {
    await federationDoctor([], cliConfig, {
      host: HOST_FILE,
      remotes: path.join(tmpDir, 'no-remote.json'),
    });
    expect(stdout()).toContain('MISSING_REMOTE_MANIFEST');
    expect(exit).toHaveBeenCalledWith(1);

    await federationDoctor([], cliConfig, {
      host: HOST_FILE,
      remotes: path.join(tmpDir, 'no-remote.json'),
      allowMissingManifests: true,
    });
    expect(stdout()).toContain('MISSING_REMOTE_MANIFEST');
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('splits a comma-separated --remotes list', async () => {
    await federationDoctor([], cliConfig, {
      host: HOST_FILE,
      remotes: `${DRIFT_REMOTE},${CLEAN_REMOTE}`,
    });

    expect(stdout()).toContain('SHARED_VERSION_DRIFT');
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('accepts an array of remotes from repeated flags', async () => {
    await federationDoctor([], cliConfig, {
      host: HOST_FILE,
      remotes: [CLEAN_REMOTE, DRIFT_REMOTE],
    });

    expect(stdout()).toContain('SHARED_VERSION_DRIFT');
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('prints parseable findings JSON as the only stdout write with --format json', async () => {
    await federationDoctor([], cliConfig, {
      host: HOST_FILE,
      remotes: DRIFT_REMOTE,
      format: 'json',
    });

    expect(log).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(log.mock.calls[0][0] as string) as {
      findings: Array<{ code: string }>;
    };
    expect(parsed.findings.map((finding) => finding.code)).toContain(
      'SHARED_VERSION_DRIFT'
    );
  });

  it('exits 2 when required options are absent', async () => {
    await federationDoctor([], cliConfig, { remotes: CLEAN_REMOTE });
    expect(error).toHaveBeenCalledWith(expect.stringContaining('--host'));

    await federationDoctor([], cliConfig, { host: HOST_FILE });
    expect(error).toHaveBeenCalledWith(expect.stringContaining('--remotes'));

    expect(exit).toHaveBeenCalledTimes(2);
    expect(exit).toHaveBeenLastCalledWith(2);
  });
});

describe('federation-doctor with repack-federation.json', () => {
  const configFixture = (name: string) => path.join(FIXTURES, name);
  let cwdSpy: jest.SpyInstance;

  function fromDir(dir: string) {
    cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(dir);
  }

  afterEach(() => {
    cwdSpy?.mockRestore();
  });

  it('runs zero-flag using the file host and remotes', async () => {
    fromDir(configFixture('config-valid'));
    await federationDoctor([], cliConfig, {});

    expect(stdout()).toContain('no issues found');
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('labels file-derived remotes with their declared names', async () => {
    fromDir(configFixture('config-drift'));
    await federationDoctor([], cliConfig, {});

    expect(stdout()).toContain('SHARED_VERSION_DRIFT');
    expect(stdout()).toContain('remote "catalog"');
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('exits 2 on a malformed file naming its path, never a stack', async () => {
    // Invalid JSON is written at runtime: a committed broken .json would
    // break the repo-wide biome check.
    const malformedDir = path.join(tmpDir, 'config-malformed');
    fs.mkdirSync(malformedDir, { recursive: true });
    fs.writeFileSync(
      path.join(malformedDir, 'repack-federation.json'),
      '{ "host": { "manifest":\n'
    );
    fromDir(malformedDir);
    await federationDoctor([], cliConfig, {});

    const printed = error.mock.calls.map(([line]) => String(line)).join('\n');
    expect(printed).toContain('Federation config');
    expect(printed).toContain(
      path.join(malformedDir, 'repack-federation.json')
    );
    expect(printed).toContain('is not valid JSON');
    expect(printed).not.toMatch(/\n\s+at\s+\S/);
    // Malformed input must never fall through to defaults or a report.
    expect(log).not.toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(2);
  });

  it('exits 2 naming the failing field path for a schema violation', async () => {
    fromDir(configFixture('config-invalid'));
    await federationDoctor([], cliConfig, {});

    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('host.manifest is required (string)')
    );
    expect(exit).toHaveBeenCalledWith(2);
  });

  it('lets --host override the file host while remotes still come from the file', async () => {
    // The file host is clean against the file remote (exit 0 baseline);
    // a flag host that drifts from that remote proves per-value precedence.
    fromDir(configFixture('config-valid'));
    await federationDoctor([], cliConfig, { host: DRIFT_REMOTE });

    expect(stdout()).toContain('SHARED_VERSION_DRIFT');
    expect(stdout()).toContain('remote "store"');
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('exits 2 with the required-option message when neither source applies', async () => {
    const isolated = fs.mkdtempSync(path.join(os.tmpdir(), 'repack-nocfg-'));
    fromDir(isolated);
    await federationDoctor([], cliConfig, {});

    expect(error).toHaveBeenCalledWith(expect.stringContaining('--host'));
    expect(exit).toHaveBeenCalledWith(2);
    fs.rmSync(isolated, { recursive: true, force: true });
  });

  it('keeps the 0/1/2 exit-code contract with --pairwise', async () => {
    fromDir(configFixture('config-valid'));
    await federationDoctor([], cliConfig, { pairwise: true });
    expect(exit).toHaveBeenLastCalledWith(0);
    exit.mockClear();

    fromDir(configFixture('config-drift'));
    await federationDoctor([], cliConfig, { pairwise: true });
    expect(exit).toHaveBeenLastCalledWith(1);
    exit.mockClear();
    cwdSpy.mockRestore();

    const badDir = path.join(tmpDir, 'pairwise-malformed');
    fs.mkdirSync(badDir, { recursive: true });
    fs.writeFileSync(
      path.join(badDir, 'repack-federation.json'),
      '{ "host": { "manifest":\n'
    );
    fromDir(badDir);
    await federationDoctor([], cliConfig, { pairwise: true });
    expect(exit).toHaveBeenLastCalledWith(2);
  });

  it('behaves identically with and without declared ports', async () => {
    fromDir(configFixture('config-valid'));
    await federationDoctor([], cliConfig, {});
    const withPort = { out: stdout(), code: exit.mock.calls[0]?.[0] };
    exit.mockClear();
    log.mockClear();
    cwdSpy.mockRestore();

    fromDir(configFixture('config-noport'));
    await federationDoctor([], cliConfig, {});

    expect(stdout()).toBe(withPort.out);
    expect(exit).toHaveBeenCalledWith(withPort.code);
  });
});

describe('federation-doctor --dry-run', () => {
  // Capability fixtures live OUTSIDE __tests__ (jest testMatch would collect
  // any .ts there): up two levels, into commands/federation/__fixtures__.
  const WORKSPACE = path.join(
    FIXTURES,
    '..',
    '..',
    '__fixtures__',
    'dry-run-workspace'
  );
  let cwdSpy: jest.SpyInstance;

  function fromDir(dir: string) {
    cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(dir);
  }

  afterEach(() => {
    cwdSpy?.mockRestore();
  });

  it('catches injected version divergence with zero builds and exits 1', async () => {
    fromDir(path.join(WORKSPACE, 'drift'));
    await federationDoctor([], cliConfig, { dryRun: true });

    expect(stdout()).toContain('SHARED_VERSION_DRIFT');
    expect(stdout()).toContain('9.9.9');
    expect(stdout()).toContain('9.8.7');
    // The unbuilt caveat rides every finding message, text mode included.
    expect(stdout()).toContain('dry-run');
    expect(stdout()).toContain('not verified against built manifests');
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('never reports MISSING_REMOTE_MANIFEST — no manifests are consulted', async () => {
    // The fixture workspace has NO build output at all: every manifest path
    // in repack-federation.json points at a directory that does not exist.
    fromDir(path.join(WORKSPACE, 'clean'));
    await federationDoctor([], cliConfig, { dryRun: true });

    expect(stdout()).not.toContain('MISSING_REMOTE_MANIFEST');
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('exits 2 on a hostile app config, printing a message and no stack', async () => {
    fromDir(path.join(WORKSPACE, 'hostile'));
    await federationDoctor([], cliConfig, { dryRun: true });

    const printed = error.mock.calls.map(([line]) => String(line)).join('\n');
    expect(printed).toContain('kaboom');
    expect(printed).not.toMatch(/\n\s+at\s+\S/);
    expect(log).not.toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(2);
  });

  it('exits 2 on a malformed repack-federation.json under --dry-run too', async () => {
    const malformedDir = path.join(tmpDir, 'dryrun-malformed');
    fs.mkdirSync(malformedDir, { recursive: true });
    fs.writeFileSync(
      path.join(malformedDir, 'repack-federation.json'),
      '{ "host": { "manifest":\n'
    );
    fromDir(malformedDir);
    await federationDoctor([], cliConfig, { dryRun: true });

    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('Federation config')
    );
    expect(exit).toHaveBeenCalledWith(2);
  });

  it('keeps the locked --format json shape with the caveat inside messages', async () => {
    fromDir(path.join(WORKSPACE, 'drift'));
    await federationDoctor([], cliConfig, { dryRun: true, format: 'json' });

    expect(log).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(log.mock.calls[0][0] as string) as {
      findings: Array<Record<string, string>>;
    };
    expect(parsed.findings.length).toBeGreaterThan(0);
    for (const finding of parsed.findings) {
      expect(Object.keys(finding)).toEqual(['severity', 'code', 'message']);
      expect(finding.message).toContain('not verified against built manifests');
    }
    expect(exit).toHaveBeenCalledWith(1);
  });
});
