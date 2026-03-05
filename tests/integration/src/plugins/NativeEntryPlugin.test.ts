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
const APP_ENTRY_VIRTUAL_MODULES = {
  './index.js': 'globalThis.__APP_ENTRY__ = true;',
};

type CompileBundleOverrides = Pick<
  Configuration,
  'mode' | 'optimization' | 'output'
>;

const PRODUCTION_OPTIMIZATION: NonNullable<Configuration['optimization']> = {
  moduleIds: 'deterministic',
  concatenateModules: true,
  mangleExports: true,
  innerGraph: true,
  usedExports: true,
  sideEffects: true,
  // Keep runtime/startup sections readable in snapshots and assertion failures.
  minimize: false,
  // NativeEntryPlugin test fixture intentionally leaves unresolved modules.
  // We still need emitted output to validate runtime/startup code shape.
  emitOnErrors: true,
};

/**
 * Normalizes bundle code for deterministic snapshots by replacing
 * machine-specific absolute paths and non-deterministic hashes.
 */
function normalizeBundle(code: string): string {
  // Webpack mangles absolute paths into variable names with underscores
  const mangledRoot = REPO_ROOT.replaceAll(/[^a-zA-Z0-9]/g, '_');
  const compactMangledRoot = mangledRoot.replaceAll(/_+/g, '_');
  return code
    .replaceAll(REPO_ROOT, '<rootDir>')
    .replaceAll(mangledRoot, '_rootDir_')
    .replaceAll(compactMangledRoot, '_rootDir_')
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
  externals?: Configuration['externals'],
  overrides: CompileBundleOverrides = {}
) {
  const virtualPlugin = await createVirtualModulePlugin(virtualModules);

  const compiler = await createCompiler({
    context: __dirname,
    mode: overrides.mode ?? 'development',
    devtool: false,
    entry: './index.js',
    output: {
      path: '/out',
      ...(overrides.output ?? {}),
    },
    optimization: overrides.optimization,
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

function normalizeModuleId(moduleId: string): string {
  return moduleId.trim().replace(/,$/, '').replace(/^["']|["']$/g, '');
}

function extractModuleIdByMarker(code: string, marker: string): string {
  const webpackModuleRegex =
    /\/\*\*\*\/\s*([^\n]+)\n(?:\/\*![\s\S]*?\*\/\n)?\([^)]*\)\s*\{([\s\S]*?)\n\/\*\*\*\/\s*\},/g;
  for (const match of code.matchAll(webpackModuleRegex)) {
    const moduleId = normalizeModuleId(match[1]);
    const moduleBody = match[2];
    if (moduleBody.includes(marker)) return moduleId;
  }

  const rspackModuleRegex =
    /\n([^\s:\n]+):\s*\(function\s*\([^)]*\)\s*\{([\s\S]*?)\n\}\),/g;
  for (const match of code.matchAll(rspackModuleRegex)) {
    const moduleId = normalizeModuleId(match[1]);
    const moduleBody = match[2];
    if (moduleBody.includes(marker)) return moduleId;
  }

  throw new Error(`Could not find module id for marker "${marker}" in bundle`);
}

function extractRuntimePolyfillRequireIds(code: string): string[] {
  const runtimeStart = code.indexOf('runtime/repack/polyfills');
  expect(runtimeStart).toBeGreaterThan(-1);
  const startupStart = code.indexOf('// startup', runtimeStart);
  expect(startupStart).toBeGreaterThan(runtimeStart);

  const runtimeSection = code.slice(runtimeStart, startupStart);
  return [...runtimeSection.matchAll(/__webpack_require__\(([^)]+)\);/g)].map(
    (match) => normalizeModuleId(match[1])
  );
}

function getStartupSection(code: string): string {
  const startupStart = code.indexOf('// startup');
  expect(startupStart).toBeGreaterThan(-1);
  return code.slice(startupStart, startupStart + 600);
}

function getRuntimeAndStartupSnippet(code: string): string {
  const runtimeStart = code.indexOf('runtime/repack/polyfills');
  expect(runtimeStart).toBeGreaterThan(-1);
  return code.slice(runtimeStart, runtimeStart + 900);
}

class RemovePolyfillRuntimeRequirementsPlugin {
  apply(compiler: any) {
    compiler.hooks.compilation.tap(
      'RemovePolyfillRuntimeRequirementsPlugin',
      (compilation: any) => {
        compilation.hooks.additionalTreeRuntimeRequirements.tap(
          {
            name: 'RemovePolyfillRuntimeRequirementsPlugin',
            stage: 10_000,
          },
          (_chunk: unknown, runtimeRequirements: Set<string>) => {
            runtimeRequirements.delete(compiler.webpack.RuntimeGlobals.require);
            runtimeRequirements.delete(
              compiler.webpack.RuntimeGlobals.moduleFactories
            );
          }
        );
      }
    );
  }
}

describe('NativeEntryPlugin', () => {
  describe('without Module Federation', () => {
    it('should execute polyfills runtime module before entry startup', async () => {
      const { code } = await compileBundle(APP_ENTRY_VIRTUAL_MODULES);

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

    describe('in production mode', () => {
      it('should expose inlined polyfills if runtime requirements are removed', async () => {
        const { code } = await compileBundle(
          APP_ENTRY_VIRTUAL_MODULES,
          [new RemovePolyfillRuntimeRequirementsPlugin()],
          undefined,
          {
            mode: 'production',
            output: { iife: true },
            optimization: PRODUCTION_OPTIMIZATION,
          }
        );

        const runtimePolyfillIds = extractRuntimePolyfillRequireIds(code);
        expect(runtimePolyfillIds).toHaveLength(2);

        const startupSection = getStartupSection(code);
        expect(startupSection).toContain('__webpack_modules__[');
        for (const moduleId of runtimePolyfillIds) {
          expect(startupSection).toContain(`__webpack_modules__[${moduleId}]();`);
        }

        expect(normalizeBundle(getRuntimeAndStartupSnippet(code))).toMatchSnapshot();
      });

      it('should keep runtime polyfill requires aligned with production module ids', async () => {
        const { code } = await compileBundle(
          APP_ENTRY_VIRTUAL_MODULES,
          [],
          undefined,
          {
            mode: 'production',
            output: { iife: true },
            optimization: PRODUCTION_OPTIMIZATION,
          }
        );

        const runtimePolyfillIds = extractRuntimePolyfillRequireIds(code);
        expect(runtimePolyfillIds).toHaveLength(2);

        const polyfillModuleIds = [
          extractModuleIdByMarker(code, '__POLYFILL_1__'),
          extractModuleIdByMarker(code, '__POLYFILL_2__'),
        ];

        expect(runtimePolyfillIds).toEqual(polyfillModuleIds);

        const startupSection = getStartupSection(code);
        expect(startupSection).not.toContain('__webpack_modules__[');
        for (const moduleId of runtimePolyfillIds) {
          expect(startupSection).toContain(`__webpack_require__(${moduleId});`);
        }

        // RuntimeGlobals.moduleFactories should keep module factories available.
        expect(code).toContain('__webpack_require__.m = __webpack_modules__');
        expect(code).toContain(
          'module factories are used so entry inlining is disabled'
        );

        expect(normalizeBundle(getRuntimeAndStartupSnippet(code))).toMatchSnapshot();
      });
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
              manifest: false,
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
