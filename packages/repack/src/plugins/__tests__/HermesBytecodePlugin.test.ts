import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { type Compiler, ModuleFilenameHelpers } from '@rspack/core';
import execa from 'execa';
import { HermesBytecodePlugin } from '../HermesBytecodePlugin/index.js';
import { composeSourceMaps } from '../HermesBytecodePlugin/utils/composeSourceMaps.js';
import { getHermesCLIPath } from '../HermesBytecodePlugin/utils/getHermesCLIPath.js';

jest.mock('node:fs', () => ({
  __esModule: true,
  default: {
    existsSync: jest.fn(),
    promises: {
      access: jest.fn(),
      readFile: jest.fn(),
      rename: jest.fn(),
      unlink: jest.fn(),
      writeFile: jest.fn(),
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

  describe('composeSourceMaps', () => {
    const options = {
      reactNativePath: 'path/to/react-native',
      packagerMapPath: 'output/path/example.bundle.map',
      compilerMapPath: 'output/path/example.bundle.hbc.map',
    };

    it('carries the Debug ID over to the composed source map', async () => {
      const debugId = '3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
      const fsMock = fs.promises as jest.Mocked<typeof fs.promises>;
      fsMock.readFile
        .mockResolvedValueOnce(`{"version":3,"debugId":"${debugId}"}`)
        .mockResolvedValueOnce('{"version":3}');

      await composeSourceMaps(options);

      expect(fsMock.writeFile).toHaveBeenCalledWith(
        `${options.packagerMapPath}.composed`,
        `{"version":3,"debugId":"${debugId}","debug_id":"${debugId}"}`
      );
      expect(fsMock.rename).toHaveBeenCalledWith(
        `${options.packagerMapPath}.composed`,
        options.packagerMapPath
      );
    });

    it('leaves the composed source map alone without a Debug ID', async () => {
      const fsMock = fs.promises as jest.Mocked<typeof fs.promises>;
      fsMock.readFile.mockResolvedValueOnce('{"version":3}');

      await composeSourceMaps(options);

      expect(fsMock.writeFile).not.toHaveBeenCalled();
    });
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
