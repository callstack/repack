import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { type Compiler, ModuleFilenameHelpers } from '@rspack/core';
import execa from 'execa';
import { HermesBytecodePlugin } from '../HermesBytecodePlugin/index.js';
import { getHermesCLIPath } from '../HermesBytecodePlugin/utils/getHermesCLIPath.js';

jest.mock('node:fs', () => ({
  __esModule: true,
  default: {
    existsSync: jest.fn(),
    promises: {
      access: jest.fn(),
      rename: jest.fn(),
      unlink: jest.fn(),
    },
  },
}));

jest.mock('execa');

function createCompilation(files: string[]) {
  return {
    outputOptions: { path: 'output/path/' },
    getAssets: () => files.map((name) => ({ name })),
  };
}

const compilerMock = {
  context: __dirname,
  options: {
    output: {
      compareBeforeEmit: true,
    },
  },
  hooks: {
    afterEmit: {
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

describe('HermesBytecodePlugin', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('skips compilation if plugin is not enabled', () => {
    const config = {
      enabled: false,
      test: /\.(js)?bundle$/,
      exclude: /index.bundle$/,
    };
    const pluginInstance = new HermesBytecodePlugin(config);

    pluginInstance.apply(compilerMock as unknown as Compiler);

    expect(compilerMock.hooks.afterEmit.tapPromise).not.toHaveBeenCalled();
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

      const fsMock = fs.promises as jest.Mocked<typeof fs.promises>;
      fsMock.access.mockResolvedValueOnce();

      await new Promise<void>((resolve, reject) => {
        compilerMock.hooks.afterEmit.tapPromise.mockImplementationOnce(
          (_, callback) => {
            callback(createCompilation(['example.bundle']))
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

      expect(compilerMock.hooks.afterEmit.tapPromise).toHaveBeenCalledTimes(1);
      expect(execaMock).toHaveBeenCalledTimes(1);
      expect(execaMock.mock.calls[0][0]).toEqual('path/to/hermesc');

      expect(execaNodeMock).toHaveBeenCalledTimes(1);
      expect(execaNodeMock.mock.calls[0][0]).toEqual(
        path.normalize('path/to/react-native/scripts/compose-source-maps.js')
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

      const fsMock = fs.promises as jest.Mocked<typeof fs.promises>;
      fsMock.access.mockRejectedValueOnce(new Error('File not found'));

      await new Promise<void>((resolve, reject) => {
        compilerMock.hooks.afterEmit.tapPromise.mockImplementationOnce(
          (_, callback) => {
            callback(createCompilation(['example.bundle']))
              .then(resolve)
              .catch(reject);
          }
        );
        pluginInstance.apply(compilerMock as unknown as Compiler);
      });

      const execaMock = execa as jest.MockedFunction<typeof execa>;

      expect(compilerMock.hooks.afterEmit.tapPromise).toHaveBeenCalledTimes(1);
      expect(execaMock).toHaveBeenCalledTimes(1);
      expect(execaMock.mock.calls[0][0]).toEqual('path/to/hermesc');
    });
  });

  it('transforms every matching asset and skips excluded ones', async () => {
    const pluginInstance = new HermesBytecodePlugin({
      enabled: true,
      test: /\.(js)?bundle$/,
      exclude: /index.bundle$/,
      reactNativePath: 'path/to/react-native',
      hermesCLIPath: 'path/to/hermesc',
    });

    const fsMock = fs.promises as jest.Mocked<typeof fs.promises>;
    fsMock.access.mockResolvedValue();

    await new Promise<void>((resolve, reject) => {
      compilerMock.hooks.afterEmit.tapPromise.mockImplementationOnce(
        (_, callback) => {
          callback(
            createCompilation([
              'a.chunk.bundle',
              'b.chunk.bundle',
              'index.bundle',
            ])
          )
            .then(resolve)
            .catch(reject);
        }
      );
      pluginInstance.apply(compilerMock as unknown as Compiler);
    });

    const execaMock = execa as jest.MockedFunction<typeof execa>;
    const execaNodeMock = execa.node as jest.MockedFunction<typeof execa.node>;

    expect(execaMock).toHaveBeenCalledTimes(2);
    expect(execaNodeMock).toHaveBeenCalledTimes(2);
  });

  describe('getHermesCLIPath', () => {
    const reactNativePath = 'path/to/react-native';

    it('returns new hermes-compiler path when it exists', () => {
      jest.spyOn(os, 'platform').mockReturnValue('darwin');
      jest.mocked(fs.existsSync).mockReturnValue(true);

      const hermesPath = getHermesCLIPath(reactNativePath);

      expect(hermesPath).toBe(
        path.normalize('path/to/hermes-compiler/hermesc/osx-bin/hermesc')
      );
    });

    it('falls back to legacy hermesc path when hermes-compiler does not exist', () => {
      jest.spyOn(os, 'platform').mockReturnValue('darwin');
      jest.mocked(fs.existsSync).mockReturnValue(false);

      const hermesPath = getHermesCLIPath(reactNativePath);

      expect(hermesPath).toBe(
        path.normalize('path/to/react-native/sdks/hermesc/osx-bin/hermesc')
      );
    });
  });
});
