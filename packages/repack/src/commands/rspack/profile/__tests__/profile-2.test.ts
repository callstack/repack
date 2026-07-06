import fs from 'node:fs';
import { rspack } from '@rspack/core';
import { asyncExitHook } from 'exit-hook';
import { applyProfile } from '../profile-2.js';

jest.mock('@rspack/core', () => ({
  rspack: {
    experiments: {
      globalTrace: { register: jest.fn(), cleanup: jest.fn() },
    },
  },
}));
jest.mock('exit-hook', () => ({ asyncExitHook: jest.fn() }));

const registerMock = jest.mocked(rspack.experiments.globalTrace.register);
const asyncExitHookMock = jest.mocked(asyncExitHook);

describe('applyProfile (rspack 2)', () => {
  beforeEach(() => {
    // avoid creating profile output directories on disk
    jest.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);
  });

  it('defaults to the logger trace layer (perfetto is unavailable in published rspack 2 binaries)', async () => {
    await applyProfile('OVERVIEW');
    expect(registerMock).toHaveBeenCalledWith('OVERVIEW', 'logger', 'stdout');
  });

  it('still accepts an explicit perfetto trace layer for custom builds', async () => {
    await applyProfile('OVERVIEW', 'perfetto');
    expect(registerMock).toHaveBeenCalledWith(
      'OVERVIEW',
      'perfetto',
      expect.stringMatching(/rspack\.pftrace$/)
    );
  });

  it('rejects unsupported trace layers', async () => {
    await expect(applyProfile('OVERVIEW', 'chrome')).rejects.toThrow(
      'unsupported trace layer: chrome'
    );
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('registers trace cleanup to run on exit', async () => {
    await applyProfile('OVERVIEW');
    expect(asyncExitHookMock).toHaveBeenCalledWith(
      rspack.experiments.globalTrace.cleanup,
      { wait: 500 }
    );
  });
});
