import fs from 'fs-extra';
import execa from 'execa';
import webpack from 'webpack';
import { ChunksToHermesBytecodePlugin } from '../ChunksToHermesBytecodePlugin';

jest.mock('fs-extra', () => ({
  __esModule: true,
  default: {
    pathExists: jest.fn(),
    rename: jest.fn(),
    unlink: jest.fn(),
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
  getInfrastructureLogger: () => console,
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

    pluginInstance.apply(compilerMock as unknown as webpack.Compiler);

    expect(compilerMock.hooks.assetEmitted.tapPromise).not.toHaveBeenCalled();
  });

  it('overrides compareBeforeEmit webpack option by default', () => {
    const config = {
      enabled: true,
      test: /\.(js)?bundle$/,
      exclude: /index.bundle$/,
    };
    const pluginInstance = new ChunksToHermesBytecodePlugin(config);

    pluginInstance.apply(compilerMock as unknown as webpack.Compiler);

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

      const fsMock = fs as jest.Mocked<typeof fs>;
      fsMock.pathExists.mockImplementationOnce(() => Promise.resolve(true));

      await new Promise<void>((resolve, reject) => {
        compilerMock.hooks.assetEmitted.tapPromise.mockImplementationOnce(
          (_, callback) => {
            callback('example.bundle', { outputPath: 'output/path/' })
              .then(resolve)
              .catch(reject);
          }
        );
        pluginInstance.apply(compilerMock as unknown as webpack.Compiler);
      });

      const execaMock = execa as jest.MockedFunction<typeof execa>;

      expect(compilerMock.hooks.assetEmitted.tapPromise).toHaveBeenCalledTimes(
        1
      );
      expect(execaMock).toHaveBeenCalledTimes(2);
      expect(execaMock.mock.calls[0][0]).toEqual('path/to/hermesc');
      expect(execaMock.mock.calls[1][1]?.[0]).toEqual(
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

      const fsMock = fs as jest.Mocked<typeof fs>;
      fsMock.pathExists.mockImplementationOnce(() => Promise.resolve(false));

      await new Promise<void>((resolve, reject) => {
        compilerMock.hooks.assetEmitted.tapPromise.mockImplementationOnce(
          (_, callback) => {
            callback('example.bundle', { outputPath: 'output/path/' })
              .then(resolve)
              .catch(reject);
          }
        );
        pluginInstance.apply(compilerMock as unknown as webpack.Compiler);
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
