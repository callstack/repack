import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { type Compiler, ModuleFilenameHelpers } from '@rspack/core';
import execa from 'execa';
import { HermesBytecodePlugin } from '../HermesBytecodePlugin/index.js';

jest.mock('node:fs', () => ({
  __esModule: true,
  default: {
    existsSync: jest.fn(),
    realpathSync: jest.fn(),
    statSync: jest.fn(),
    promises: {
      access: jest.fn(),
      rename: jest.fn(),
      unlink: jest.fn(),
    },
  },
}));

jest.mock('execa');

function emitAssets(files: string[]) {
  const [, onAssetEmitted] = compilerMock.hooks.assetEmitted.tap.mock.calls[0];
  for (const file of files) {
    onAssetEmitted(file, { outputPath: 'output/path/' });
  }
}

const compilerMock = {
  context: __dirname,
  options: {
    output: {
      compareBeforeEmit: true,
    },
  },
  hooks: {
    assetEmitted: {
      tap: jest.fn(),
    },
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
            emitAssets(['example.bundle']);
            callback().then(resolve).catch(reject);
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
            emitAssets(['example.bundle']);
            callback().then(resolve).catch(reject);
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
          emitAssets(['a.chunk.bundle', 'b.chunk.bundle', 'index.bundle']);
          callback().then(resolve).catch(reject);
        }
      );
      pluginInstance.apply(compilerMock as unknown as Compiler);
    });

    const execaMock = execa as jest.MockedFunction<typeof execa>;
    const execaNodeMock = execa.node as jest.MockedFunction<typeof execa.node>;

    expect(execaMock).toHaveBeenCalledTimes(2);
    expect(execaNodeMock).toHaveBeenCalledTimes(2);
  });

  it('ignores unchanged assets on rebuild', async () => {
    const pluginInstance = new HermesBytecodePlugin({
      enabled: true,
      test: /\.(js)?bundle$/,
      exclude: /index.bundle$/,
      reactNativePath: 'path/to/react-native',
      hermesCLIPath: 'path/to/hermesc',
    });

    const fsMock = fs.promises as jest.Mocked<typeof fs.promises>;
    fsMock.access.mockResolvedValue();

    pluginInstance.apply(compilerMock as unknown as Compiler);
    const [, afterEmit] = compilerMock.hooks.afterEmit.tapPromise.mock.calls[0];

    emitAssets(['a.chunk.bundle', 'b.chunk.bundle']);
    await afterEmit();

    emitAssets(['b.chunk.bundle']);
    await afterEmit();

    const execaMock = execa as jest.MockedFunction<typeof execa>;
    const transformedBundles = execaMock.mock.calls.map(([, args]) =>
      (args as string[]).at(-1)
    );

    expect(transformedBundles).toEqual([
      path.join('output/path/', 'a.chunk.bundle'),
      path.join('output/path/', 'b.chunk.bundle'),
      path.join('output/path/', 'b.chunk.bundle'),
    ]);
  });

  describe('hermesc lookup', () => {
    const reactNativePath = path.resolve('/project/node_modules/react-native');
    const config = {
      enabled: true,
      test: /\.(js)?bundle$/,
      exclude: /index.bundle$/,
      reactNativePath,
    };

    beforeEach(() => {
      jest.spyOn(os, 'platform').mockReturnValue('darwin');
      const fsMock = fs.promises as jest.Mocked<typeof fs.promises>;
      fsMock.access.mockRejectedValue(new Error('File not found'));
    });

    it('uses hermesCLIPath without looking up hermesc', async () => {
      const pluginInstance = new HermesBytecodePlugin({
        ...config,
        hermesCLIPath: 'path/to/hermesc',
      });

      pluginInstance.apply(compilerMock as unknown as Compiler);
      const [, afterEmit] =
        compilerMock.hooks.afterEmit.tapPromise.mock.calls[0];

      emitAssets(['a.chunk.bundle']);
      await afterEmit();

      expect(fs.existsSync).not.toHaveBeenCalled();
      expect(jest.mocked(execa).mock.calls[0][0]).toBe('path/to/hermesc');
    });

    it('does not look up hermesc until a matching asset is emitted', async () => {
      const pluginInstance = new HermesBytecodePlugin(config);

      expect(() =>
        pluginInstance.apply(compilerMock as unknown as Compiler)
      ).not.toThrow();
      const [, afterEmit] =
        compilerMock.hooks.afterEmit.tapPromise.mock.calls[0];

      emitAssets(['index.bundle', 'image.png']);
      await expect(afterEmit()).resolves.toBeUndefined();

      expect(fs.existsSync).not.toHaveBeenCalled();
      expect(execa).not.toHaveBeenCalled();
    });

    it('fails the emit with the checked paths when hermesc is not found', async () => {
      const pluginInstance = new HermesBytecodePlugin(config);

      pluginInstance.apply(compilerMock as unknown as Compiler);
      const [, afterEmit] =
        compilerMock.hooks.afterEmit.tapPromise.mock.calls[0];

      emitAssets(['a.chunk.bundle']);
      const error = await afterEmit().catch((e: Error) => e);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Could not find the Hermes compiler');
      expect(error.message).toContain(
        path.join(reactNativePath, 'sdks/hermesc/osx-bin/hermesc')
      );
      expect(execa).not.toHaveBeenCalled();
    });

    it('looks up hermesc once and reuses it', async () => {
      jest.mocked(fs.existsSync).mockReturnValue(true);
      const pluginInstance = new HermesBytecodePlugin(config);

      pluginInstance.apply(compilerMock as unknown as Compiler);
      const [, afterEmit] =
        compilerMock.hooks.afterEmit.tapPromise.mock.calls[0];

      emitAssets(['a.chunk.bundle', 'b.chunk.bundle']);
      await afterEmit();
      emitAssets(['c.chunk.bundle']);
      await afterEmit();

      const hermesCompilerPath = path.join(
        reactNativePath,
        '..',
        'hermes-compiler/hermesc/osx-bin/hermesc'
      );
      expect(fs.existsSync).toHaveBeenCalledTimes(1);
      expect(jest.mocked(execa).mock.calls.map(([file]) => file)).toEqual([
        hermesCompilerPath,
        hermesCompilerPath,
        hermesCompilerPath,
      ]);
    });
  });
});
