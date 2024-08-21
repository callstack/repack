import webpack from 'webpack';
import ReactRefreshPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import type { DevServerOptions, WebpackPlugin } from '../../types';

type ExtractEntryStaticNormalized<E> = E extends () => Promise<infer U>
  ? U
  : E extends { [key: string]: any }
    ? E
    : never;

type EntryStaticNormalized =
  ExtractEntryStaticNormalized<webpack.EntryNormalized>;

type ModuleDependency = webpack.dependencies.ModuleDependency;
/**
 * {@link DevelopmentPlugin} configuration options.
 */
export interface DevelopmentPluginConfig {
  platform: string;
  devServer?: DevServerOptions;
}

/**
 * Class for running development server that handles serving the built bundle, all assets as well as
 * providing Hot Module Replacement functionality.
 *
 * @category Webpack Plugin
 */
export class DevelopmentPlugin implements WebpackPlugin {
  /**
   * Constructs new `DevelopmentPlugin`.
   *
   * @param config Plugin configuration options.
   */
  constructor(private config?: DevelopmentPluginConfig) {}

  /**
   * Apply the plugin.
   *
   * @param compiler Webpack compiler instance.
   */
  apply(compiler: webpack.Compiler) {
    const logger = compiler.getInfrastructureLogger('DevelopmentPlugin');

    if (!this.config?.devServer) {
      return;
    }

    // Enforce output filenames in development mode
    compiler.options.output.filename = (pathData) =>
      pathData.chunk?.name === 'main' ? 'index.bundle' : '[name].bundle';
    compiler.options.output.chunkFilename = '[name].chunk.bundle';

    new webpack.DefinePlugin({
      __PUBLIC_PORT__: JSON.stringify(this.config.devServer.port),
      __PLATFORM__: JSON.stringify(this.config.platform),
    }).apply(compiler);

    if (this.config?.devServer.hmr) {
      new webpack.HotModuleReplacementPlugin().apply(compiler);
      new ReactRefreshPlugin({
        overlay: false,
      }).apply(compiler);

      // To avoid the problem from https://github.com/facebook/react/issues/20377
      // we need to move React Refresh entry that `ReactRefreshPlugin` injects to evaluate right
      // before the `WebpackHMRClient` and after `InitializeCore` which sets up React DevTools.
      // Thanks to that the initialization order is correct:
      // 0. Polyfills
      // 1. `InitilizeCore` -> React DevTools
      // 2. Rect Refresh Entry
      // 3. `WebpackHMRClient`
      // NOTE: This needs to be done before compilation begins
      const getAdjustedEntry = (
        entry: EntryStaticNormalized,
        refreshEntryPath: string
      ) => {
        for (const key in entry) {
          const { import: entryImports = [] } = entry[key];
          const hmrClientIndex = entryImports.findIndex((value) =>
            /WebpackHMRClient\.js/.test(value)
          );
          if (hmrClientIndex >= 0) {
            entryImports.splice(hmrClientIndex, 0, refreshEntryPath);
            entry[key].import = entryImports;
          }
        }
        return entry;
      };

      // To modify the entry before compilation
      // we need to obtain the path to ReactRefreshEntry.js manually
      const reactRefreshEntryPath = require.resolve(
        '@pmmmwh/react-refresh-webpack-plugin/client/ReactRefreshEntry.js'
      );

      if (typeof compiler.options.entry !== 'function') {
        compiler.options.entry = getAdjustedEntry(
          compiler.options.entry,
          reactRefreshEntryPath
        );
      } else {
        const getEntry = compiler.options.entry;
        compiler.options.entry = async () => {
          const entry = await getEntry();
          return getAdjustedEntry(entry, reactRefreshEntryPath);
        };
      }

      compiler.hooks.make.tapAsync(
        'RemoveOriginalReactRefreshEntry',
        (compilation, callback) => {
          const globalEntryDeps = compilation.globalEntry
            .dependencies as ModuleDependency[];
          const refreshEntryIndex = globalEntryDeps.findIndex((value) =>
            /ReactRefreshEntry\.js/.test(value.request)
          );
          if (refreshEntryIndex >= 0) {
            globalEntryDeps.splice(refreshEntryIndex, 1);
          }
          callback(null);
        }
      );
    }

    if (compiler.options.experiments?.lazyCompilation) {
      if (compiler.options.experiments.lazyCompilation.entries !== false) {
        compiler.hooks.initialize.tap('DevelopmentPlugin', () => {
          logger.error(
            'You have enabled lazyCompilation for entrypoints which is not supported. ' +
              'Lazy compilation is supported only for dynamic imports. ' +
              'You can fix this by adding { entries: false } to experiments.lazyCompilation configuration object inside webpack.config.'
          );
        });
      }

      try {
        require.resolve('react-native-event-source');
      } catch (error) {
        compiler.hooks.initialize.tap('DevelopmentPlugin', () => {
          logger.error(
            "You have enabled lazyCompilation but 'react-native-event-source' was not found in your devDependencies. " +
              'Please install it via your package manager and try again.'
          );
        });
      }

      new webpack.ProvidePlugin({
        EventSource: ['react-native-event-source', 'default'],
      }).apply(compiler);
    }
  }
}
