import fs from 'node:fs';
import { type Compiler, ModuleFilenameHelpers } from '@rspack/core';
import execa from 'execa';
import { ChunksToHermesBytecodePlugin } from '../ChunksToHermesBytecodePlugin';

jest.mock('node:fs', () => ({
  __esModule: true,
  default: {
    promises: {
      access: jest.fn(),
      rename: jest.fn(),
      unlink: jest.fn(),
    },
  },
}));

jest.mock('execa');

const compilerMock = {
  context: __dirname,
  options: {
    output: {
      compareBeforeEmit: true,
    },
  },
  hooks: {
    assetEmitted: {
      tapPromise: jest.fn(),
    },
  },
  getInfrastructureLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
  }),
  webpack: {
    ModuleFilenameHelpers: ModuleFilenameHelpers,
  },
};

describe('ChunksToHermesBytecodePlugin', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('skips compilation if plugin is not enabled', () => {
    const config = {
      enabled: false,
      test: /\.(js)?bundle$/,
      exclude: /index.bundle$/,
    };
    const pluginInstance = new ChunksToHermesBytecodePlugin(config);

    pluginInstance.apply(compilerMock as unknown as Compiler);

    expect(compilerMock.hooks.assetEmitted.tapPromise).not.toHaveBeenCalled();
  });

  it('overrides compareBeforeEmit webpack option by default', () => {
    const config = {
      enabled: true,
      test: /\.(js)?bundle$/,
      exclude: /index.bundle$/,
    };
    const pluginInstance = new ChunksToHermesBytecodePlugin(config);

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
      const pluginInstance = new ChunksToHermesBytecodePlugin(config);

      const fsMock = fs.promises as jest.Mocked<typeof fs.promises>;
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
      const execaMock = execa as jest.MockedFunction<typeof execa>;
      const execaNodeMock = execa.node as jest.MockedFunction<
        typeof execa.node
      >;

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
      const pluginInstance = new ChunksToHermesBytecodePlugin(config);

      const fsMock = fs.promises as jest.Mocked<typeof fs.promises>;
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

      const execaMock = execa as jest.MockedFunction<typeof execa>;

      expect(compilerMock.hooks.assetEmitted.tapPromise).toHaveBeenCalledTimes(
        1
      );
      expect(execaMock).toHaveBeenCalledTimes(1);
      expect(execaMock.mock.calls[0][0]).toEqual('path/to/hermesc');
    });
  });
});
