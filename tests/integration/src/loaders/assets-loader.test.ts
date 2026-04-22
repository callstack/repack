import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { getAssetExtensionsRegExp, getResolveOptions } from '@callstack/repack';
import { describe, expect, it } from 'vitest';
import {
  compile,
  createCompiler,
  createVirtualModulePlugin,
  getReactNativeVirtualModules,
} from '../helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  },
  maxInlineSize?: number
) {
  const virtualPlugin = await createVirtualModulePlugin(virtualModules);

  const compiler = await createCompiler({
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
            loader: require.resolve('@callstack/repack/assets-loader'),
            options: {
              platform,
              inline,
              remote,
              maxInlineSize,
            },
          },
        },
      ],
    },
    plugins: [virtualPlugin],
  });

  return compile(compiler);
}

describe('assetLoader', () => {
  describe.each(['ios', 'android'])('on %s', (platform) => {
    it('should load and extract asset without scales', async () => {
      const { code, volume } = await compileBundle(platform, {
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
      const { code, volume } = await compileBundle(platform, {
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
      const { code, volume } = await compileBundle(platform, {
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

  describe('should inline asset based on maxInlineSize', () => {
    it('inlines asset when size is within threshold', async () => {
      // logo.android.png is 1948 bytes — threshold above it triggers inline
      const { code, volume } = await compileBundle(
        'android',
        {
          ...getReactNativeVirtualModules(),
          './index.js':
            "export { default } from './__fixtures__/assets/logo.png';",
        },
        true,
        undefined,
        2000
      );

      const context: { Export?: { default: Record<string, unknown> } } = {};
      vm.runInNewContext(code, context);

      expect(context.Export?.default).toMatchSnapshot();
      expect(volume.toTree()).toMatchSnapshot();
    });

    it('extracts asset when size exceeds threshold', async () => {
      // logo.android.png is 1948 bytes — threshold below it prevents inline
      const { code, volume } = await compileBundle(
        'android',
        {
          ...getReactNativeVirtualModules(),
          './index.js':
            "export { default } from './__fixtures__/assets/logo.png';",
        },
        true,
        undefined,
        1000
      );

      const context: { Export?: { default: Record<string, unknown> } } = {};
      vm.runInNewContext(code, context);

      expect(context.Export?.default).toMatchSnapshot();
      expect(volume.toTree()).toMatchSnapshot();
    });

    it('uses largest variant to determine threshold (multi-scale asset)', async () => {
      // star@3x.png is 21176 bytes — the largest variant determines whether to inline
      const { code, volume } = await compileBundle(
        'android',
        {
          ...getReactNativeVirtualModules(),
          './index.js':
            "export { default } from './__fixtures__/assets/star.png';",
        },
        true,
        undefined,
        10000 // below star@3x (21176 bytes), so should extract
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
});
