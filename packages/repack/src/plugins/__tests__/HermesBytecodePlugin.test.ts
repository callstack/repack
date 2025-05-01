import fs from 'node:fs';
import { type Compiler, ModuleFilenameHelpers } from '@rspack/core';
import execa from 'execa';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HermesBytecodePlugin } from '../HermesBytecodePlugin/index.js';

vi.mock('node:fs', () => ({
  __esModule: true,
  default: {
    promises: {
      access: vi.fn(),
      rename: vi.fn(),
      unlink: vi.fn(),
    },
  },
}));

vi.mock('execa');

const compilerMock = {
  context: __dirname,
  options: {
    output: {
      compareBeforeEmit: true,
    },
  },
  hooks: {
    assetEmitted: {
      tapPromise: vi.fn(),
    },
  },
  getInfrastructureLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
  }),
  webpack: {
    ModuleFilenameHelpers: ModuleFilenameHelpers,
  },
};

describe('HermesBytecodePlugin', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('skips compilation if plugin is not enabled', () => {
    const config = {
      enabled: false,
      test: /\.(js)?bundle$/,
      exclude: /index.bundle$/,
    };
    const pluginInstance = new HermesBytecodePlugin(config);

    pluginInstance.apply(compilerMock as unknown as Compiler);

    expect(compilerMock.hooks.assetEmitted.tapPromise).not.toHaveBeenCalled();
  });

  it('overrides compareBeforeEmit webpack option by default', () => {
    const config = {
      enabled: true,
      test: /\.(js)?bundle$/,
      exclude: /index.bundle$/,
    };
    const pluginInstance = new HermesBytecodePlugin(config);

    pluginInstance.apply(compilerMock as unknown as Compiler);

    expect(compilerMock.options.output.compareBeforeEmit).toBe(false);
  });

  describe('transforms bundle to hermes bytecode when plugin is enabled', () => {
    it('with source-maps when found', async () => {
      const config = {
        enabled: true,
        test: /\.(js)?bundle$/,
        exclude: /index.bundle$/,
        reactNativePath: 'path/to/react-native',
        hermesCLIPath: 'path/to/hermesc',
      };
      const pluginInstance = new HermesBytecodePlugin(config);

      const fsMock = vi.mocked(fs.promises);
      fsMock.access.mockResolvedValueOnce();

      await new Promise<void>((resolve, reject) => {
        compilerMock.hooks.assetEmitted.tapPromise.mockImplementationOnce(
          (_, callback) => {
            callback('example.bundle', { outputPath: 'output/path/' })
              .then(resolve)
              .catch(reject);
          }
        );
        pluginInstance.apply(compilerMock as unknown as Compiler);
      });
      const execaMock = vi.mocked(execa);
      const execaNodeMock = vi.mocked(execa.node);

      expect(compilerMock.hooks.assetEmitted.tapPromise).toHaveBeenCalledTimes(
        1
      );
      expect(execaMock).toHaveBeenCalledTimes(1);
      expect(execaMock.mock.calls[0][0]).toEqual('path/to/hermesc');

      expect(execaNodeMock).toHaveBeenCalledTimes(1);
      expect(execaNodeMock.mock.calls[0][0]).toEqual(
        'path/to/react-native/scripts/compose-source-maps.js'
      );
    });

    it('without source-maps if not found', async () => {
      const config = {
        enabled: true,
        test: /\.(js)?bundle$/,
        exclude: /index.bundle$/,
        reactNativePath: 'path/to/react-native',
        hermesCLIPath: 'path/to/hermesc',
      };
      const pluginInstance = new HermesBytecodePlugin(config);

      const fsMock = vi.mocked(fs.promises);
      fsMock.access.mockRejectedValueOnce(new Error('File not found'));

      await new Promise<void>((resolve, reject) => {
        compilerMock.hooks.assetEmitted.tapPromise.mockImplementationOnce(
          (_, callback) => {
            callback('example.bundle', { outputPath: 'output/path/' })
              .then(resolve)
              .catch(reject);
          }
        );
        pluginInstance.apply(compilerMock as unknown as Compiler);
      });

      const execaMock = vi.mocked(execa);

      expect(compilerMock.hooks.assetEmitted.tapPromise).toHaveBeenCalledTimes(
        1
      );
      expect(execaMock).toHaveBeenCalledTimes(1);
      expect(execaMock.mock.calls[0][0]).toEqual('path/to/hermesc');
    });
  });
});
