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
  inline?: boolean,
  remote?: {
    enabled: boolean;
    assetPath?: (...props: any) => string;
    publicPath: string;
  }
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
              remote,
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
        'node_modules/react-native/Libraries/Image/AssetRegistry.js':
          'module.exports = { registerAsset: (spec) => spec };',
        'node_modules/react-native/Libraries/Utilities/PixelRatio.js':
          'module.exports = { get: () => 1 };',
        'node_modules/react-native/Libraries/Image/AssetSourceResolver.js': `
          module.exports = class AssetSourceResolver { 
            constructor(a,b,c) { 
              this.asset = c 
            } 
            scaledAssetPath() { 
              var scale = require('react-native/Libraries/Utilities/PixelRatio').get()
              var scaleSuffix = scale === 1 ? '' : '@x' + scale;
              return { 
                __packager_asset: true, 
                width: this.asset.width, 
                height: this.asset.height, 
                uri: this.asset.httpServerLocation + '/' + this.asset.name + scaleSuffix + '.' + this.asset.type,
                scale: scale,
              } 
            }
            static pickScale(scales, pixelRatio) {
              return scales[pixelRatio - 1];
            } 
          };`,
        ...virtualModules,
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
    it.each([
      { reactNativeVersion: '<0.72', moduleExportSyntax: 'module.exports =' },
      { reactNativeVersion: '>=0.72', moduleExportSyntax: 'export default ' },
    ])(
      'without scales - React Native $reactNativeVersion',
      async ({ moduleExportSyntax }) => {
        const { code } = await compileBundle(
          'android',
          {
            'node_modules/react-native/Libraries/Utilities/PixelRatio.js': `${moduleExportSyntax} { get: () => 1 };`,
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
        expect(context.Export?.default).toEqual({
          uri: `data:image/png;base64,${logo}`,
          width: 2292,
          height: 393,
          scale: 1,
        });
      }
    );

    it.each([
      {
        prefferedScale: 1,
        reactNativeVersion: '<0.72',
        moduleExportSyntax: 'module.exports =',
      },
      {
        prefferedScale: 2,
        reactNativeVersion: '<0.72',
        moduleExportSyntax: 'module.exports =',
      },
      {
        prefferedScale: 3,
        reactNativeVersion: '<0.72',
        moduleExportSyntax: 'module.exports =',
      },
      {
        prefferedScale: 1,
        reactNativeVersion: '>=0.72',
        moduleExportSyntax: 'export default ',
      },
      {
        prefferedScale: 2,
        reactNativeVersion: '>=0.72',
        moduleExportSyntax: 'export default ',
      },
      {
        prefferedScale: 3,
        reactNativeVersion: '>=0.72',
        moduleExportSyntax: 'export default ',
      },
    ])(
      'with scales ($prefferedScale) - React Native $reactNativeVersion',
      async ({ prefferedScale, moduleExportSyntax }) => {
        const { code } = await compileBundle(
          'android',
          {
            'node_modules/react-native/Libraries/Utilities/PixelRatio.js': `${moduleExportSyntax} { get: () => ${prefferedScale} };`,
            './index.js': "export { default } from './__fixtures__/star.png';",
          },
          true
        );

        const context: { Export?: { default: Record<string, any> } } = {};
        vm.runInNewContext(code, context);

        const logos = await Promise.all([
          (
            await fs.promises.readFile(
              path.join(__dirname, './__fixtures__/star@1x.png')
            )
          ).toString('base64'),
          (
            await fs.promises.readFile(
              path.join(__dirname, './__fixtures__/star@2x.png')
            )
          ).toString('base64'),
          (
            await fs.promises.readFile(
              path.join(__dirname, './__fixtures__/star@3x.png')
            )
          ).toString('base64'),
        ]);

        expect(context.Export?.default).toEqual({
          uri: `data:image/png;base64,${logos[prefferedScale - 1]}`,
          width: 286,
          height: 272,
          scale: prefferedScale,
        });
      }
    );
  });

  describe('should convert to remote-asset', () => {
    it('without scales', async () => {
      const { code } = await compileBundle(
        'ios', // platform doesn't matter for remote-assets
        {
          './index.js': "export { default } from './__fixtures__/logo.png';",
        },
        false,
        {
          enabled: true,
          publicPath: 'http://localhost:9999',
        }
      );

      const context: { Export?: { default: Record<string, any> } } = {};
      vm.runInNewContext(code, context);

      expect(context.Export?.default).toEqual({
        __packager_asset: true,
        uri: `http://localhost:9999/assets/__fixtures__/logo.png`,
        height: 393,
        width: 2292,
        scale: 1,
      });
    });

    it.each([
      { prefferedScale: 1 },
      { prefferedScale: 2 },
      { prefferedScale: 3 },
    ])('with scales $prefferedScale', async ({ prefferedScale }) => {
      const { code } = await compileBundle(
        'ios', // platform doesn't matter for remote-assets
        {
          'node_modules/react-native/Libraries/Utilities/PixelRatio.js': `module.exports = { get: () => ${prefferedScale} };`,
          './index.js': "export { default } from './__fixtures__/star.png';",
        },
        false,
        {
          enabled: true,
          publicPath: 'http://localhost:9999',
        }
      );

      const context: { Export?: { default: Record<string, any> } } = {};
      vm.runInNewContext(code, context);

      expect(context.Export?.default).toEqual({
        __packager_asset: true,
        uri: `http://localhost:9999/assets/__fixtures__/star${
          prefferedScale === 1 ? '' : '@x' + prefferedScale
        }.png`,
        height: 272,
        width: 286,
        scale: prefferedScale,
      });
    });

    it('with URL containing a path after basename', async () => {
      const { code } = await compileBundle(
        'ios', // platform doesn't matter for remote-assets
        {
          './index.js': "export { default } from './__fixtures__/logo.png';",
        },
        false,
        {
          enabled: true,
          publicPath: 'http://localhost:9999/remote-assets',
        }
      );

      const context: { Export?: { default: Record<string, any> } } = {};
      vm.runInNewContext(code, context);

      expect(context.Export?.default).toEqual({
        __packager_asset: true,
        uri: `http://localhost:9999/remote-assets/assets/__fixtures__/logo.png`,
        height: 393,
        width: 2292,
        scale: 1,
      });
    });

    describe('with specified assetPath', () => {
      it('without scales', async () => {
        const { code } = await compileBundle(
          'ios', // platform doesn't matter for remote-assets
          {
            './index.js': "export { default } from './__fixtures__/logo.png';",
          },
          false,
          {
            enabled: true,
            assetPath: ({
              resourceFilename,
              resourceDirname,
              resourceExtensionType,
            }) => {
              return `${resourceDirname}/nested-folder/${resourceFilename}-fake-hash.${resourceExtensionType}`;
            },
            publicPath: 'http://localhost:9999/remote-assets',
          }
        );

        const context: { Export?: { default: Record<string, any> } } = {};
        vm.runInNewContext(code, context);

        expect(context.Export?.default).toEqual({
          __packager_asset: true,
          uri: `http://localhost:9999/remote-assets/assets/__fixtures__/nested-folder/logo-fake-hash.png`,
          height: 393,
          width: 2292,
          scale: 1,
        });
      });

      it.each([
        { prefferedScale: 1 },
        { prefferedScale: 2 },
        { prefferedScale: 3 },
      ])('with scales $prefferedScale', async ({ prefferedScale }) => {
        const { code } = await compileBundle(
          'ios', // platform doesn't matter for remote-assets
          {
            'node_modules/react-native/Libraries/Utilities/PixelRatio.js': `module.exports = { get: () => ${prefferedScale} };`,
            './index.js': "export { default } from './__fixtures__/star.png';",
          },
          false,
          {
            enabled: true,
            assetPath: ({
              resourceFilename,
              resourceDirname,
              resourceExtensionType,
            }) => {
              return `${resourceDirname}/nested-folder/${resourceFilename}-fake-hash.${resourceExtensionType}`;
            },
            publicPath: 'http://localhost:9999',
          }
        );

        const context: { Export?: { default: Record<string, any> } } = {};
        vm.runInNewContext(code, context);

        expect(context.Export?.default).toEqual({
          __packager_asset: true,
          uri: `http://localhost:9999/assets/__fixtures__/nested-folder/star-fake-hash${
            prefferedScale === 1 ? '' : '@x' + prefferedScale
          }.png`,
          height: 272,
          width: 286,
          scale: prefferedScale,
        });
      });
    });
  });
});
