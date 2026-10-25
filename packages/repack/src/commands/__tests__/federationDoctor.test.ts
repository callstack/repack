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
