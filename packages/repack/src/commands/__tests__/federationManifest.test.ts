import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { FederationManifest } from '../../plugins/federationManifest/types.js';
import { federationManifest } from '../federationManifest.js';
import type { CliConfig } from '../types.js';

const FIXTURES = path.join(
  __dirname,
  '..',
  'federation',
  '__tests__',
  '__fixtures__'
);
const HOST_FILE = path.join(FIXTURES, 'host.json');

const cliConfig: CliConfig = {
  root: '/project',
  platforms: ['ios'],
  reactNativePath: '/project/node_modules/react-native',
};

let tmpDir: string;
let log: jest.SpyInstance;
let error: jest.SpyInstance;
let exit: jest.SpyInstance;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repack-manifest-cmd-'));
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

describe('federation-manifest command', () => {
  it('prints the formatted manifest for a positional source', async () => {
    await federationManifest([HOST_FILE], cliConfig, {});

    expect(stdout()).toContain('shell');
    expect(stdout()).toContain('shared (3)');
    expect(exit).not.toHaveBeenCalled();
  });

  it('accepts --source and prints parseable JSON as the only stdout write', async () => {
    await federationManifest([], cliConfig, { source: HOST_FILE, json: true });

    expect(log).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(
      log.mock.calls[0][0] as string
    ) as FederationManifest;
    expect(parsed.name).toBe('shell');
  });

  it('prefers the positional source over --source', async () => {
    await federationManifest([HOST_FILE], cliConfig, {
      source: '/does/not/matter.json',
      json: true,
    });

    expect(log).toHaveBeenCalledTimes(1);
    expect(exit).not.toHaveBeenCalled();
  });

  it('ignores a non-string argv[0] (commander options object) and uses --source', async () => {
    // RN CLI >= 17 passes the parsed options object as argv[0] whenever no
    // positional was captured; it must not be mistaken for the source.
    await federationManifest(
      [{ source: HOST_FILE, json: true }] as unknown as string[],
      cliConfig,
      { source: HOST_FILE, json: true }
    );

    expect(log).toHaveBeenCalledTimes(1);
    expect(JSON.parse(log.mock.calls[0][0] as string).name).toBe('shell');
    expect(exit).not.toHaveBeenCalled();
  });

  it('exits 2 when no source is given', async () => {
    await federationManifest([], cliConfig, {});

    expect(error).toHaveBeenCalledWith(expect.stringContaining('--source'));
    expect(exit).toHaveBeenCalledWith(2);
    expect(log).not.toHaveBeenCalled();
  });

  it('exits 2 with an actionable message for an unresolvable source', async () => {
    const missing = path.join(tmpDir, 'nope.json');

    await federationManifest([missing], cliConfig, {});

    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('ManifestNotFoundError')
    );
    expect(exit).toHaveBeenCalledWith(2);
  });

  it('exits 2 with an actionable message for a corrupt manifest', async () => {
    const corrupt = path.join(tmpDir, 'corrupt.json');
    fs.writeFileSync(corrupt, '{"manifestVersion": 1, ');

    await federationManifest([corrupt], cliConfig, {});

    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('ManifestInvalidError')
    );
    expect(exit).toHaveBeenCalledWith(2);
  });
});
