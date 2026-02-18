import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { plugins } from '@callstack/repack';
import type { Configuration } from '@rspack/core';
import { Volume, createFsFromVolume } from 'memfs';
import { describe, expect, inject, it } from 'vitest';
import { createCompiler, createVirtualModulePlugin } from '../helpers.js';

// Webpack throws when multiple versions of @module-federation/enhanced register
// serializers with the same key. Patch ObjectMiddleware.register to allow
// re-registration since we externalize all MF modules and never use serialization.
// @ts-expect-error no types for internal webpack module
import ObjectMiddleware from 'webpack/lib/serialization/ObjectMiddleware';
const _register = ObjectMiddleware.register.bind(ObjectMiddleware);
ObjectMiddleware.register = (...args: unknown[]) => {
  try {
    _register(...args);
  } catch (e: any) {
    if (!e.message?.includes('is already registered')) throw e;
  }
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REACT_NATIVE_PATH = path.join(__dirname, '__fixtures__', 'react-native');
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

/**
 * Normalizes bundle code for deterministic snapshots by replacing
 * machine-specific absolute paths and non-deterministic hashes.
 */
function normalizeBundle(code: string): string {
  // Webpack mangles absolute paths into variable names with underscores
  const mangledRoot = REPO_ROOT.replaceAll('/', '_').replaceAll('-', '_');
  return code
    .replaceAll(REPO_ROOT, '<rootDir>')
    .replaceAll(mangledRoot, '_rootDir_')
    .replace(
      /\.federation\/entry\.[a-f0-9]+\.js/g,
      '.federation/entry.HASH.js'
    );
}

/**
 * NativeEntryPlugin adds native entries (InitializeScriptManager, IncludeModules)
 * that cannot fully resolve in test environments. We intentionally ignore compilation
 * errors and focus on verifying the bundle structure and polyfill positioning.
 */
async function compileBundle(
  virtualModules: Record<string, string>,
  extraPlugins: Array<{ apply(compiler: any): void }> = [],
  externals?: Configuration['externals']
) {
  const virtualPlugin = await createVirtualModulePlugin(virtualModules);

  const compiler = await createCompiler({
    context: __dirname,
    mode: 'development',
    devtool: false,
    entry: './index.js',
    output: {
      path: '/out',
    },
    resolve: {
      alias: {
        'react-native': REACT_NATIVE_PATH,
      },
    },
    externals,
    plugins: [
      new plugins.NativeEntryPlugin({}),
      virtualPlugin,
      ...extraPlugins,
    ],
  });

  const volume = new Volume();
  const fileSystem = createFsFromVolume(volume);
  // @ts-expect-error memfs is compatible enough with the output filesystem
  compiler.outputFileSystem = fileSystem;

  return new Promise<{ code: string; volume: InstanceType<typeof Volume> }>(
    (resolve, reject) => {
      compiler.run((error) => {
        if (error) {
          reject(error);
          return;
        }
        const code = fileSystem.readFileSync('/out/main.js', 'utf-8') as string;
        resolve({ code, volume });
      });
    }
  );
}

/**
 * Asserts that the given markers appear sequentially in the bundle code.
 * Each marker is searched starting after the previous match, so repeated
 * strings (e.g. in function definitions vs call sites) are handled correctly.
 */
function expectBundleOrder(code: string, markers: string[]) {
  let searchFrom = 0;
  for (const marker of markers) {
    const pos = code.indexOf(marker, searchFrom);
    expect(
      pos,
      `Expected "${marker}" in bundle after position ${searchFrom}`
    ).toBeGreaterThan(-1);
    searchFrom = pos + marker.length;
  }
}

describe('NativeEntryPlugin', () => {
  describe('without Module Federation', () => {
    it('should execute polyfills runtime module before entry startup', async () => {
      const { code } = await compileBundle({
        './index.js': 'globalThis.__APP_ENTRY__ = true;',
      });

      // Polyfill modules were processed through the loader pipeline
      expect(code).toContain('__POLYFILL_1__');
      expect(code).toContain('__POLYFILL_2__');
      expect(code).toContain('__INITIALIZE_CORE__');

      // Without MF there is no deferred startup wrapper
      expect(code).not.toContain('__webpack_require__.x');

      // Polyfills runtime module IIFE executes before inline startup entries
      expectBundleOrder(code, [
        'webpack/runtime/repack/polyfills',
        'Load entry module and return exports',
      ]);

      expect(normalizeBundle(code)).toMatchSnapshot();
    });
  });

  describe('with Module Federation v1', () => {
    it('should execute polyfills runtime module before MF v1 startup', async () => {
      const { code } = await compileBundle(
        {
          './index.js': 'globalThis.__APP_ENTRY__ = true;',
          './App.js': 'export default globalThis.__FEDERATED_EXPORT__ = true;',
        },
        [
          new plugins.ModuleFederationPluginV1({
            name: 'testContainer',
            exposes: {
              './App': './App.js',
            },
            shared: {
              react: { singleton: true, eager: true },
              'react-native': { singleton: true, eager: true },
            },
            reactNativeDeepImports: false,
          }),
        ]
      );

      // Polyfill modules were processed through the loader pipeline
      expect(code).toContain('__POLYFILL_1__');
      expect(code).toContain('__POLYFILL_2__');
      expect(code).toContain('__INITIALIZE_CORE__');

      // With all-eager shared modules, MF v1 uses inline startup (no deferred wrapper)
      // Polyfills runtime module IIFE executes before inline startup entries
      expectBundleOrder(code, [
        'webpack/runtime/repack/polyfills',
        'Load entry module and return exports',
      ]);

      expect(normalizeBundle(code)).toMatchSnapshot();
    });
  });

  const MF_V2_VERSIONS = [
    { version: '0.15.0', pkg: '@module-federation/enhanced-v15' },
    { version: '0.21.0', pkg: '@module-federation/enhanced-v21' },
    { version: '2.0.1', pkg: '@module-federation/enhanced' },
  ];

  const mfExternals = ((
    { request, context }: { request?: string; context?: string },
    callback: (err: Error | null, result?: string) => void
  ) => {
    if (
      request?.includes('@module-federation') ||
      context?.includes('@module-federation') ||
      request?.includes('isomorphic-rslog')
    ) {
      return callback(null, 'globalThis.__MF_EXTERNAL__');
    }
    callback(null);
  }) as Configuration['externals'];

  describe.each(MF_V2_VERSIONS)(
    'with Module Federation v2 ($version)',
    ({ pkg }) => {
      it('should execute polyfills runtime module before MF v2 federation runtime', async () => {
        const bundlerType = inject('bundlerType');
        const subpath = bundlerType === 'rspack' ? 'rspack' : 'webpack';
        const { ModuleFederationPlugin } = await import(`${pkg}/${subpath}`);

        const { code } = await compileBundle(
          {
            './index.js': 'globalThis.__APP_ENTRY__ = true;',
            './App.js':
              'export default globalThis.__FEDERATED_EXPORT__ = true;',
          },
          [
            new ModuleFederationPlugin({
              name: 'testContainer',
              exposes: {
                './App': './App.js',
              },
              shared: {
                react: { singleton: true, eager: true },
                'react-native': { singleton: true, eager: true },
              },
            }),
          ],
          mfExternals
        );

        // Polyfill modules were processed through the loader pipeline
        expect(code).toContain('__POLYFILL_1__');
        expect(code).toContain('__POLYFILL_2__');

        if (bundlerType === 'rspack') {
          // Rspack MF v2 wraps startup via embed_federation_runtime:
          //   1. embed_federation_runtime saves original __webpack_require__.x and wraps it
          //   2. repack/polyfills IIFE executes (polyfills loaded immediately)
          //   3. __webpack_require__.x() called → MF init → original startup (polyfills are cache hits)
          expect(code).toContain('embed_federation_runtime');
          expectBundleOrder(code, [
            'embed_federation_runtime',
            'webpack/runtime/repack/polyfills',
            '__webpack_require__.x()',
          ]);
        } else {
          // Webpack MF v2 uses inline startup with a .federation/entry module:
          //   1. repack/polyfills IIFE executes (polyfills loaded immediately)
          //   2. Inline startup begins: federation entry, then polyfills (cache hits), then app
          expect(code).toContain('.federation/entry');
          expectBundleOrder(code, [
            'webpack/runtime/repack/polyfills',
            '.federation/entry',
          ]);
        }

        expect(normalizeBundle(code)).toMatchSnapshot();
      });
    }
  );
});
