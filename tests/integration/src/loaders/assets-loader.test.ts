import { createHash } from 'node:crypto';
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
  maxInlineSize?: number,
  configuration: { extensions?: string[]; devServer?: boolean } = {}
) {
  const virtualPlugin = await createVirtualModulePlugin(virtualModules);

  const compiler = await createCompiler({
    context: __dirname,
    mode: 'development',
    devtool: false,
    ...(configuration.devServer ? { devServer: {} } : {}),
    entry: './index.js',
    resolve: getResolveOptions(platform),
    output: {
      path: '/out',
      library: 'Export',
    },
    module: {
      rules: [
        {
          test: getAssetExtensionsRegExp(configuration.extensions),
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
  describe('font asset placement', () => {
    const extensions = ['ttf', 'otf', 'ttc'];

    it.each(extensions)(
      'should emit .%s fonts to font and raw without changing metadata',
      async (extension) => {
        const content = `font fixture ${extension}\n`;
        const { code, volume } = await compileBundle(
          'android',
          {
            ...getReactNativeVirtualModules(),
            './index.js': `export { default } from './__fixtures__/assets/TestFont.${extension}';`,
          },
          false,
          { enabled: false, publicPath: 'http://localhost:9999' },
          undefined,
          { extensions }
        );

        const context: { Export?: { default: Record<string, unknown> } } = {};
        vm.runInNewContext(code, context);

        expect(context.Export?.default).toMatchObject({
          name: 'TestFont',
          type: extension,
          scales: [1],
          hash: createHash('md5').update(content).digest('hex'),
          httpServerLocation: 'assets/__fixtures__/assets',
        });
        expect(
          volume.readFileSync(
            `/out/raw/__fixtures___assets_testfont.${extension}`,
            'utf8'
          )
        ).toBe(content);
        expect(
          volume.readFileSync(
            `/out/font/__fixtures___assets_testfont.${extension}`,
            'utf8'
          )
        ).toBe(content);
      }
    );

    it('should inline fonts without emitting files', async () => {
      const content = 'font fixture ttf\n';
      const { code, volume } = await compileBundle(
        'android',
        {
          ...getReactNativeVirtualModules(),
          './index.js':
            "export { default } from './__fixtures__/assets/TestFont.ttf';",
        },
        true
      );

      const context: { Export?: { default: Record<string, unknown> } } = {};
      vm.runInNewContext(code, context);

      expect(context.Export?.default).toMatchObject({
        uri: `data:font/ttf;base64,${Buffer.from(content).toString('base64')}`,
        scale: 1,
      });
      expect(volume.existsSync('/out/raw')).toBe(false);
      expect(volume.existsSync('/out/font')).toBe(false);
      expect(volume.existsSync('/out/assets')).toBe(false);
    });

    it.each([
      {
        filename: 'TestFontFamily',
        content: '<font-family></font-family>\n',
        destination: 'font',
      },
      {
        filename: 'TestShape',
        content: '<shape></shape>\n',
        destination: 'drawable-mdpi',
      },
    ])(
      'should emit XML resources to $destination',
      async ({ filename, content, destination }) => {
        const { code, volume } = await compileBundle(
          'android',
          {
            ...getReactNativeVirtualModules(),
            './index.js': `export { default } from './__fixtures__/assets/${filename}.xml';`,
          },
          false,
          undefined,
          undefined,
          { extensions: ['xml'] }
        );

        const context: { Export?: { default: Record<string, unknown> } } = {};
        vm.runInNewContext(code, context);

        expect(context.Export?.default).toMatchObject({
          name: filename,
          type: 'xml',
        });
        expect(
          volume.readFileSync(
            `/out/${destination}/__fixtures___assets_${filename.toLowerCase()}.xml`,
            'utf8'
          )
        ).toBe(content);
      }
    );

    describe.each([
      { mode: 'iOS', platform: 'ios', devServer: false, remote: false },
      {
        mode: 'Android dev server',
        platform: 'android',
        devServer: true,
        remote: false,
      },
      {
        mode: 'Android remote',
        platform: 'android',
        devServer: false,
        remote: true,
      },
    ])('$mode fonts', ({ platform, devServer, remote }) => {
      it.each(extensions)(
        'should preserve existing .%s asset paths',
        async (extension) => {
          const content = `font fixture ${extension}\n`;
          const { code, volume } = await compileBundle(
            platform,
            {
              ...getReactNativeVirtualModules(),
              './index.js': `export { default } from './__fixtures__/assets/TestFont.${extension}';`,
            },
            false,
            remote
              ? { enabled: true, publicPath: 'http://localhost:9999' }
              : undefined,
            undefined,
            { extensions, devServer }
          );

          const context: { Export?: { default: Record<string, unknown> } } = {};
          vm.runInNewContext(code, context);

          expect(
            volume.readFileSync(
              `/out/${remote ? 'remote-assets/' : ''}assets/__fixtures__/assets/TestFont.${extension}`,
              'utf8'
            )
          ).toBe(content);
          expect(volume.existsSync('/out/raw')).toBe(false);
          expect(volume.existsSync('/out/font')).toBe(false);
          if (remote) {
            expect(context.Export?.default).toMatchObject({
              uri: `http://localhost:9999/assets/__fixtures__/assets/TestFont.${extension}`,
              scale: 1,
            });
          } else {
            expect(context.Export?.default).toMatchObject({
              name: 'TestFont',
              type: extension,
              httpServerLocation: 'assets/__fixtures__/assets',
            });
            if (devServer) {
              expect(context.Export?.default).toHaveProperty(
                'fileSystemLocation',
                '__fixtures__/assets'
              );
            }
          }
        }
      );
    });
  });

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
