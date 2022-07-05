import vm from 'vm';
import fs from 'fs';
import path from 'path';
import webpack from 'webpack';
import memfs from 'memfs';
import VirtualModulesPlugin from 'webpack-virtual-modules';
import { AssetsResolverPlugin } from '../../../plugins/AssetsResolverPlugin';
import {
  ASSET_EXTENSIONS,
  getAssetExtensionsRegExp,
  SCALABLE_ASSETS,
} from '../../../utils/assetExtensions';

async function compileBundle(
  platform: string,
  virtualModules: Record<string, string>,
  inline?: boolean
) {
  const compiler = webpack({
    context: __dirname,
    mode: 'development',
    devtool: false,
    entry: './index.js',
    output: {
      path: '/out',
      library: 'Export',
    },
    module: {
      rules: [
        {
          test: getAssetExtensionsRegExp(ASSET_EXTENSIONS),
          use: {
            loader: require.resolve('../assetsLoader'),
            options: {
              platform,
              scalableAssetExtensions: SCALABLE_ASSETS,
              inline,
            },
          },
        },
      ],
    },
    plugins: [
      new AssetsResolverPlugin({
        platform,
      }),
      new VirtualModulesPlugin({
        ...virtualModules,
        'node_modules/react-native/Libraries/Image/AssetRegistry.js':
          'module.exports = { registerAsset: (spec) => spec };',
      }),
    ],
  });

  const fileSystem = memfs.createFsFromVolume(new memfs.Volume());
  compiler.outputFileSystem = fileSystem;

  return await new Promise<{ code: string; fileSystem: memfs.IFs }>(
    (resolve, reject) =>
      compiler.run((error) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            code: fileSystem.readFileSync('/out/main.js', 'utf-8') as string,
            fileSystem,
          });
        }
      })
  );
}

describe('assetLoader', () => {
  describe('on ios', () => {
    it('should load and extract asset without scales', async () => {
      const { code, fileSystem } = await compileBundle('ios', {
        './index.js': "export { default } from './__fixtures__/logo.png';",
      });

      const context: { Export?: { default: Record<string, any> } } = {};
      vm.runInNewContext(code, context);

      expect(context.Export?.default).toEqual({
        __packager_asset: true,
        scales: [1],
        name: 'logo',
        type: 'png',
        hash: '521f8ddc5577ea2db000c5d25df4117f',
        httpServerLocation: 'assets/__fixtures__',
        height: 393,
        width: 2292,
      });
      expect(
        fileSystem.existsSync('/out/assets/__fixtures__/logo.png')
      ).toBeTruthy();
    });

    it('should load and extract asset with scales', async () => {
      const { code, fileSystem } = await compileBundle('ios', {
        './index.js': "export { default } from './__fixtures__/star.png';",
      });

      const context: { Export?: { default: Record<string, any> } } = {};
      vm.runInNewContext(code, context);

      expect(context.Export?.default).toEqual({
        __packager_asset: true,
        scales: [1, 2, 3],
        name: 'star',
        type: 'png',
        hash: 'b7b9a680a66a56f8c5cdb6e9d3dba123,d8dcb8fdd518215d0423b24203a5526c,403f940da729b6a47e9e881dca53f39e',
        httpServerLocation: 'assets/__fixtures__',
        height: 272,
        width: 286,
      });
      expect(
        fileSystem.existsSync('/out/assets/__fixtures__/star.png')
      ).toBeTruthy();
      expect(
        fileSystem.existsSync('/out/assets/__fixtures__/star@2x.png')
      ).toBeTruthy();
      expect(
        fileSystem.existsSync('/out/assets/__fixtures__/star@3x.png')
      ).toBeTruthy();
    });
  });

  describe('on android', () => {
    it('should load and extract asset without scales', async () => {
      const { code, fileSystem } = await compileBundle('android', {
        './index.js': "export { default } from './__fixtures__/logo.png';",
      });

      const context: { Export?: { default: Record<string, any> } } = {};
      vm.runInNewContext(code, context);

      expect(context.Export?.default).toEqual({
        __packager_asset: true,
        scales: [1],
        name: 'logo',
        type: 'png',
        hash: '521f8ddc5577ea2db000c5d25df4117f',
        httpServerLocation: 'assets/__fixtures__',
        height: 393,
        width: 2292,
      });
      expect(
        fileSystem.existsSync('/out/drawable-mdpi/__fixtures___logo.png')
      ).toBeTruthy();
    });

    it('should load and extract asset with scales', async () => {
      const { code, fileSystem } = await compileBundle('android', {
        './index.js': "export { default } from './__fixtures__/star.png';",
      });

      const context: { Export?: { default: Record<string, any> } } = {};
      vm.runInNewContext(code, context);

      expect(context.Export?.default).toEqual({
        __packager_asset: true,
        scales: [1, 2, 3],
        name: 'star',
        type: 'png',
        hash: 'b7b9a680a66a56f8c5cdb6e9d3dba123,d8dcb8fdd518215d0423b24203a5526c,403f940da729b6a47e9e881dca53f39e',
        httpServerLocation: 'assets/__fixtures__',
        height: 272,
        width: 286,
      });
      expect(
        fileSystem.existsSync('/out/drawable-mdpi/__fixtures___star.png')
      ).toBeTruthy();
      expect(
        fileSystem.existsSync('/out/drawable-xhdpi/__fixtures___star.png')
      ).toBeTruthy();
      expect(
        fileSystem.existsSync('/out/drawable-xxhdpi/__fixtures___star.png')
      ).toBeTruthy();
    });
  });

  describe('should inline asset', () => {
    it('without scales', async () => {
      const { code } = await compileBundle(
        'android',
        {
          './index.js': "export { default } from './__fixtures__/logo.png';",
        },
        true
      );

      const context: { Export?: { default: Record<string, any> } } = {};
      vm.runInNewContext(code, context);

      const logo = (
        await fs.promises.readFile(
          path.join(__dirname, './__fixtures__/logo.png')
        )
      ).toString('base64');
      expect(context.Export?.default.uri).toEqual(
        `data:image/png;base64,${logo}`
      );
    });

    it('with scales', async () => {
      const { code } = await compileBundle(
        'android',
        {
          './index.js': "export { default } from './__fixtures__/star.png';",
        },
        true
      );

      const context: { Export?: { default: Record<string, any> } } = {};
      vm.runInNewContext(code, context);

      const logo = (
        await fs.promises.readFile(
          path.join(__dirname, './__fixtures__/star@3x.png')
        )
      ).toString('base64');
      expect(context.Export?.default.uri).toEqual(
        `data:image/png;base64,${logo}`
      );
    });
  });
});
