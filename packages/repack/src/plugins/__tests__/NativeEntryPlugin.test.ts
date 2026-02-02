import path from 'node:path';
import {
  type RspackPluginInstance,
  type StatsModule,
  rspack,
} from '@rspack/core';
import memfs from 'memfs';
import { RspackVirtualModulePlugin } from 'rspack-plugin-virtual-module';
import { ModuleFederationPluginV2 } from '../ModuleFederationPluginV2.js';
import { NativeEntryPlugin } from '../NativeEntryPlugin/index.js';

const FIXTURES_PATH = path.join(__dirname, '__fixtures__');
const REACT_NATIVE_PATH = path.join(FIXTURES_PATH, 'react-native');

interface CompileBundleOptions {
  extraAliases?: Record<string, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  externals?: any;
}

async function compileBundle(
  entry: Record<string, { import: string[] }>,
  virtualModules: Record<string, string>,
  extraPlugins: RspackPluginInstance[] = [],
  options: CompileBundleOptions = {}
) {
  const compiler = rspack({
    context: __dirname,
    mode: 'development',
    devtool: false,
    entry,
    output: {
      path: '/out',
      filename: '[name].js',
    },
    resolve: {
      alias: {
        'react-native': REACT_NATIVE_PATH,
        ...options.extraAliases,
      },
    },
    externals: options.externals,
    plugins: [
      new NativeEntryPlugin({}),
      ...extraPlugins,
      new RspackVirtualModulePlugin({
        ...virtualModules,
      }),
    ],
  });

  const volume = new memfs.Volume();
  const fileSystem = memfs.createFsFromVolume(volume);
  // @ts-expect-error memfs is compatible enough
  compiler.outputFileSystem = fileSystem;

  return new Promise<{
    code: string;
    fileSystem: typeof memfs.fs;
    volume: typeof memfs.vol;
    modules: StatsModule[];
  }>((resolve, reject) =>
    compiler.run((error, stats) => {
      if (error) {
        reject(error);
      } else {
        const statsJson = stats?.toJson({ modules: true });
        resolve({
          code: fileSystem.readFileSync('/out/main.js', 'utf-8') as string,
          fileSystem,
          volume,
          modules: statsJson?.modules ?? [],
        });
      }
    })
  );
}

describe('NativeEntryPlugin', () => {
  it('should add polyfills as runtime modules that execute before MF v2 federation runtime', async () => {
    const { code } = await compileBundle(
      { main: { import: ['./index.js'] } },
      {
        './index.js': 'globalThis.__APP_ENTRY__ = true;',
        './App.js': 'export default globalThis.__FEDERATED_EXPORT__ = true;',
      },
      [
        new ModuleFederationPluginV2({
          name: 'testContainer',
          exposes: {
            './App': './App.js',
          },
          shared: {
            react: { singleton: true, eager: true },
            'react-native': { singleton: true, eager: true },
          },
          // Disable default runtime plugins to simplify test
          defaultRuntimePlugins: [],
        }),
      ],
      {
        externals: (
          { request, context }: { request?: string; context?: string },
          callback: (err: Error | null, result?: string) => void
        ) => {
          // Externalize all @module-federation packages and their internal paths
          if (
            request?.includes('@module-federation') ||
            context?.includes('@module-federation') ||
            request?.includes('isomorphic-rslog')
          ) {
            return callback(null, 'globalThis.__MF_EXTERNAL__');
          }
          callback(null);
        },
      }
    );

    expect(code).toMatchSnapshot('mf-v2');

    // MF v2 uses embed_federation_runtime which wraps the startup function
    expect(code).toContain('embed_federation_runtime');

    // Polyfills are now runtime modules (webpack/runtime/repack/polyfills)
    // Runtime modules execute BEFORE __webpack_require__.x() (the startup function)
    // This means polyfills run before MF v2's embed_federation_runtime wrapper
    expect(code).toContain('webpack/runtime/repack/polyfills');

    // Verify polyfills are in the runtime section (before startup execution)
    const polyfillsRuntimePos = code.indexOf(
      'webpack/runtime/repack/polyfills'
    );
    const startupExecutionPos = code.indexOf('__webpack_require__.x()');

    expect(polyfillsRuntimePos).toBeGreaterThan(-1);
    expect(startupExecutionPos).toBeGreaterThan(-1);
    expect(polyfillsRuntimePos).toBeLessThan(startupExecutionPos);
  });
});
