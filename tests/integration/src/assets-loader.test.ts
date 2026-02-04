import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { getAssetExtensionsRegExp, getResolveOptions } from '@callstack/repack';
import { describe, expect, it } from 'vitest';
import {
  type BundlerType,
  compile,
  createVirtualModulePlugin,
  getAssetsLoaderPath,
  getBundler,
  getReactNativeVirtualModules,
} from './test-helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function compileBundle(
  bundlerType: BundlerType,
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
  const bundler = await getBundler(bundlerType);
  const virtualPlugin = await createVirtualModulePlugin(
    bundlerType,
    virtualModules
  );

  const compiler = bundler({
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
            loader: getAssetsLoaderPath(),
            options: {
              platform,
              inline,
              remote,
            },
          },
        },
      ],
    },
    plugins: [virtualPlugin],
  });

  return compile(compiler);
}

describe.each(['rspack', 'webpack'] as const)(
  'assetLoader with %s',
  (bundlerType) => {
    describe.each(['ios', 'android'])('on %s', (platform) => {
      it('should load and extract asset without scales', async () => {
        const { code, volume } = await compileBundle(bundlerType, platform, {
          ...getReactNativeVirtualModules(),
          './index.js':
            "export { default } from './__fixtures__/assets/logo.png';",
        });

        const context: { Export?: { default: Record<string, unknown> } } = {};
        vm.runInNewContext(code, context);

        expect(context.Export?.default).toMatchSnapshot();
        expect(volume.toTree()).toMatchSnapshot();
      });

      it('should load and extract asset with scales', async () => {
        const { code, volume } = await compileBundle(bundlerType, platform, {
          ...getReactNativeVirtualModules(),
          './index.js':
            "export { default } from './__fixtures__/assets/star.png';",
        });

        const context: { Export?: { default: Record<string, unknown> } } = {};
        vm.runInNewContext(code, context);

        expect(context.Export?.default).toMatchSnapshot();
        expect(volume.toTree()).toMatchSnapshot();
      });

      it('should prefer platform specific asset', async () => {
        const { code, volume } = await compileBundle(bundlerType, platform, {
          ...getReactNativeVirtualModules(),
          './index.js':
            "export { default } from './__fixtures__/assets/logo.png';",
        });

        const context: { Export?: { default: Record<string, unknown> } } = {};
        vm.runInNewContext(code, context);

        expect(context.Export?.default).toMatchSnapshot();
        expect(volume.toTree()).toMatchSnapshot();
      });
    });

    describe('should inline asset', () => {
      it('without scales', async () => {
        const { code, volume } = await compileBundle(
          bundlerType,
          'android',
          {
            ...getReactNativeVirtualModules(),
            './index.js':
              "export { default } from './__fixtures__/assets/logo.png';",
          },
          true
        );

        const context: { Export?: { default: Record<string, unknown> } } = {};
        vm.runInNewContext(code, context);

        expect(context.Export?.default).toMatchSnapshot();
        expect(volume.toTree()).toMatchSnapshot();
      });

      it.each([
        { preferredScale: 1 },
        { preferredScale: 2 },
        { preferredScale: 3 },
      ])('with scales ($preferredScale)', async ({ preferredScale }) => {
        const { code, volume } = await compileBundle(
          bundlerType,
          'android',
          {
            ...getReactNativeVirtualModules(preferredScale),
            './index.js':
              "export { default } from './__fixtures__/assets/star.png';",
          },
          true
        );

        const context: { Export?: { default: Record<string, unknown> } } = {};
        vm.runInNewContext(code, context);

        expect(context.Export?.default).toMatchSnapshot();
        expect(volume.toTree()).toMatchSnapshot();
      });
    });

    describe('should convert to remote-asset', () => {
      it('without scales', async () => {
        const { code, volume } = await compileBundle(
          bundlerType,
          'ios', // platform doesn't matter for remote-assets
          {
            ...getReactNativeVirtualModules(),
            './index.js':
              "export { default } from './__fixtures__/assets/logo.png';",
          },
          false,
          {
            enabled: true,
            publicPath: 'http://localhost:9999',
          }
        );

        const context: { Export?: { default: Record<string, unknown> } } = {};
        vm.runInNewContext(code, context);

        expect(context.Export?.default).toMatchSnapshot();
        expect(volume.toTree()).toMatchSnapshot();
      });

      it.each([
        { preferredScale: 1 },
        { preferredScale: 2 },
        { preferredScale: 3 },
      ])('with scales $preferredScale', async ({ preferredScale }) => {
        const { code, volume } = await compileBundle(
          bundlerType,
          'ios', // platform doesn't matter for remote-assets
          {
            ...getReactNativeVirtualModules(preferredScale),
            './index.js':
              "export { default } from './__fixtures__/assets/star.png';",
          },
          false,
          {
            enabled: true,
            publicPath: 'http://localhost:9999',
          }
        );

        const context: { Export?: { default: Record<string, unknown> } } = {};
        vm.runInNewContext(code, context);

        expect(context.Export?.default).toMatchSnapshot();
        expect(volume.toTree()).toMatchSnapshot();
      });

      it('with URL containing a path after basename', async () => {
        const { code, volume } = await compileBundle(
          bundlerType,
          'ios', // platform doesn't matter for remote-assets
          {
            ...getReactNativeVirtualModules(),
            './index.js':
              "export { default } from './__fixtures__/assets/logo.png';",
          },
          false,
          {
            enabled: true,
            publicPath: 'http://localhost:9999/remote-assets',
          }
        );

        const context: { Export?: { default: Record<string, unknown> } } = {};
        vm.runInNewContext(code, context);

        expect(context.Export?.default).toMatchSnapshot();
        expect(volume.toTree()).toMatchSnapshot();
      });

      describe('with specified assetPath', () => {
        it('without scales', async () => {
          const { code, volume } = await compileBundle(
            bundlerType,
            'ios', // platform doesn't matter for remote-assets
            {
              ...getReactNativeVirtualModules(),
              './index.js':
                "export { default } from './__fixtures__/assets/logo.png';",
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

          const context: { Export?: { default: Record<string, unknown> } } = {};
          vm.runInNewContext(code, context);

          expect(context.Export?.default).toMatchSnapshot();
          expect(volume.toTree()).toMatchSnapshot();
        });

        it.each([
          { preferredScale: 1 },
          { preferredScale: 2 },
          { preferredScale: 3 },
        ])('with scales $preferredScale', async ({ preferredScale }) => {
          const { code, volume } = await compileBundle(
            bundlerType,
            'ios', // platform doesn't matter for remote-assets
            {
              ...getReactNativeVirtualModules(preferredScale),
              './index.js':
                "export { default } from './__fixtures__/assets/star.png';",
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

          const context: { Export?: { default: Record<string, unknown> } } = {};
          vm.runInNewContext(code, context);

          expect(context.Export?.default).toMatchSnapshot();
          expect(volume.toTree()).toMatchSnapshot();
        });
      });
    });
  }
);
