import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import memfs from 'memfs';
import { rspack } from '@rspack/core';
import { RspackVirtualModulePlugin } from 'rspack-plugin-virtual-module';
import { getAssetExtensionsRegExp, getResolveOptions } from '../../../utils';

function loadFixtures(...filenames: string[]) {
  return filenames
    .map((filename: string) => {
      const localPath = path.join(__dirname, '__fixtures__', filename);
      const assetPath = `./__fixtures__/${filename}`;
      const assetData = fs.readFileSync(localPath);
      return [assetPath, assetData] as const;
    })
    .reduce(
      (acc, [assetPath, assetData]) => {
        acc[assetPath] = assetData;
        return acc;
      },
      {} as Record<string, Buffer>
    );
}

async function compileBundle(
  platform: string,
  virtualModules: Record<string, string>,
  inline?: boolean,
  remote?: {
    enabled: boolean;
    assetPath?: (args: {
      resourcePath: string;
      resourceFilename: string;
      resourceDirname: string;
      resourceExtensionType: string;
    }) => string;
    publicPath: string;
  }
) {
  const vmp = new RspackVirtualModulePlugin({
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
  });

  const compiler = rspack({
    context: __dirname,
    mode: 'development',
    devtool: false,
    entry: './index.js',
    resolve: getResolveOptions(platform),
    output: {
      path: '/out',
      library: 'Export',
    },
    module: {
      rules: [
        {
          test: getAssetExtensionsRegExp(),
          use: {
            loader: require.resolve('../assetsLoader'),
            options: {
              platform,
              inline,
              remote,
            },
          },
        },
      ],
    },
    plugins: [vmp],
  });

  const volume = new memfs.Volume();
  const fileSystem = memfs.createFsFromVolume(volume);
  // @ts-expect-error memfs is compatible enough
  compiler.outputFileSystem = fileSystem;

  return await new Promise<{
    code: string;
    fileSystem: typeof memfs.fs;
    volume: typeof memfs.vol;
  }>((resolve, reject) =>
    compiler.run((error) => {
      if (error) {
        reject(error);
      } else {
        resolve({
          code: fileSystem.readFileSync('/out/main.js', 'utf-8') as string,
          fileSystem,
          volume,
        });
      }
    })
  );
}

// TODO Fix when input filesystem is supported
describe('assetLoader', () => {
  const fixtures = loadFixtures(
    'logo.png',
    'star@1x.png',
    'star@2x.png',
    'star@3x.png'
  );

  describe('on ios', () => {
    it('should load and extract asset without scales', async () => {
      const { code, volume } = await compileBundle('ios', {
        ...fixtures,
        './index.js': "export { default } from './__fixtures__/logo.png';",
      });
      const context: { Export?: { default: Record<string, any> } } = {};
      vm.runInNewContext(code, context);

      expect(context.Export?.default).toMatchSnapshot();
      expect(volume.toTree()).toMatchSnapshot();
    });

    it('should load and extract asset with scales', async () => {
      const { code, volume } = await compileBundle('ios', {
        './index.js': "export { default } from './__fixtures__/star.png';",
      });

      const context: { Export?: { default: Record<string, any> } } = {};
      vm.runInNewContext(code, context);

      expect(context.Export?.default).toMatchSnapshot();
      expect(volume.toTree()).toMatchSnapshot();
    });
  });

  describe('on android', () => {
    it('should load and extract asset without scales', async () => {
      const { code, volume } = await compileBundle('android', {
        './index.js': "export { default } from './__fixtures__/logo.png';",
      });

      const context: { Export?: { default: Record<string, any> } } = {};
      vm.runInNewContext(code, context);

      expect(context.Export?.default).toMatchSnapshot();
      expect(volume.toTree()).toMatchSnapshot();
    });

    it('should load and extract asset with scales', async () => {
      const { code, volume } = await compileBundle('android', {
        './index.js': "export { default } from './__fixtures__/star.png';",
      });

      const context: { Export?: { default: Record<string, any> } } = {};
      vm.runInNewContext(code, context);

      expect(context.Export?.default).toMatchSnapshot();
      expect(volume.toTree()).toMatchSnapshot();
    });
  });

  describe('should inline asset', () => {
    it.each([
      { reactNativeVersion: '<0.72', moduleExportSyntax: 'module.exports =' },
      { reactNativeVersion: '>=0.72', moduleExportSyntax: 'export default ' },
    ])(
      'without scales - React Native $reactNativeVersion',
      async ({ moduleExportSyntax }) => {
        const { code, volume } = await compileBundle(
          'android',
          {
            ...fixtures,
            'node_modules/react-native/Libraries/Utilities/PixelRatio.js': `${moduleExportSyntax} { get: () => 1 };`,
            './index.js': "export { default } from './__fixtures__/logo.png';",
          },
          true
        );

        const context: { Export?: { default: Record<string, any> } } = {};
        vm.runInNewContext(code, context);

        expect(context.Export?.default).toMatchSnapshot();
        expect(volume.toTree()).toMatchSnapshot();
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
        const { code, volume } = await compileBundle(
          'android',
          {
            ...fixtures,
            'node_modules/react-native/Libraries/Utilities/PixelRatio.js': `${moduleExportSyntax} { get: () => ${prefferedScale} };`,
            './index.js': "export { default } from './__fixtures__/star.png';",
          },
          true
        );

        const context: { Export?: { default: Record<string, any> } } = {};
        vm.runInNewContext(code, context);

        expect(context.Export?.default).toMatchSnapshot();
        expect(volume.toTree()).toMatchSnapshot();
      }
    );
  });

  describe('should convert to remote-asset', () => {
    it('without scales', async () => {
      const { code, volume } = await compileBundle(
        'ios', // platform doesn't matter for remote-assets
        {
          ...fixtures,
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

      expect(context.Export?.default).toMatchSnapshot();
      expect(volume.toTree()).toMatchSnapshot();
    });

    it.each([
      { prefferedScale: 1 },
      { prefferedScale: 2 },
      { prefferedScale: 3 },
    ])('with scales $prefferedScale', async ({ prefferedScale }) => {
      const { code, volume } = await compileBundle(
        'ios', // platform doesn't matter for remote-assets
        {
          ...fixtures,
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

      expect(context.Export?.default).toMatchSnapshot();
      expect(volume.toTree()).toMatchSnapshot();
    });

    it('with URL containing a path after basename', async () => {
      const { code, volume } = await compileBundle(
        'ios', // platform doesn't matter for remote-assets
        {
          ...fixtures,
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

      expect(context.Export?.default).toMatchSnapshot();
      expect(volume.toTree()).toMatchSnapshot();
    });

    describe('with specified assetPath', () => {
      it('without scales', async () => {
        const { code, volume } = await compileBundle(
          'ios', // platform doesn't matter for remote-assets
          {
            ...fixtures,
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

        expect(context.Export?.default).toMatchSnapshot();
        expect(volume.toTree()).toMatchSnapshot();
      });

      it.each([
        { prefferedScale: 1 },
        { prefferedScale: 2 },
        { prefferedScale: 3 },
      ])('with scales $prefferedScale', async ({ prefferedScale }) => {
        const { code, volume } = await compileBundle(
          'ios', // platform doesn't matter for remote-assets
          {
            ...fixtures,
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

        expect(context.Export?.default).toMatchSnapshot();
        expect(volume.toTree()).toMatchSnapshot();
      });
    });
  });
});
