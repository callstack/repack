import webpack from 'webpack';
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import type { DevServerOptions, WebpackPlugin } from '../../types';

type ExtractEntryStaticNormalized<E> = E extends () => Promise<infer U>
  ? U
  : E extends { [key: string]: any }
  ? E
  : never;

type EntryStaticNormalized =
  ExtractEntryStaticNormalized<webpack.EntryNormalized>;

/**
 * {@link ReactRefreshPlugin} configuration options.
 */
export interface ReactRefreshPluginConfig extends DevServerOptions {
  platform: string;
}

/**
 * Class for setting up Hot Module Replacement and React Refresh support using `@pmmmwh/react-refresh-webpack-plugin`.
 *
 * @category Webpack Plugin
 */
export class ReactRefreshPlugin implements WebpackPlugin {
  /**
   * Constructs new `ReactRefreshPlugin`.
   *
   * @param config Plugin configuration options.
   */
  constructor(private config?: ReactRefreshPluginConfig) {}

  /**
   * Apply the plugin.
   *
   * @param compiler Webpack compiler instance.
   */
  apply(compiler: webpack.Compiler) {
    if (!this.config) {
      return;
    }

    new webpack.DefinePlugin({
      __PUBLIC_PORT__: JSON.stringify(this.config.port),
      __PLATFORM__: JSON.stringify(this.config.platform),
    }).apply(compiler);

    if (this.config?.hmr) {
      new webpack.HotModuleReplacementPlugin().apply(compiler);
      new ReactRefreshWebpackPlugin({
        overlay: false,
      }).apply(compiler);

      // To avoid the problem from https://github.com/facebook/react/issues/20377
      // we need to move React Refresh entry that `ReactRefreshWebpackPlugin` injects, to evaluate right
      // before the `WebpackHMRClient` and after `InitializeCore` which sets up React DevTools.
      // Thanks to that the initialization order is correct:
      // 0. Polyfills
      // 1. `InitilizeCore` -> React DevTools
      // 2. React Refresh Entry
      // 3. `WebpackHMRClient`
      const getAdjustedEntry = (entry: EntryStaticNormalized) => {
        for (const key in entry) {
          const { import: entryImports = [] } = entry[key];
          const refreshEntryIndex = entryImports.findIndex((value) =>
            /ReactRefreshEntry\.js/.test(value)
          );
          if (refreshEntryIndex >= 0) {
            const refreshEntry = entryImports[refreshEntryIndex];
            entryImports.splice(refreshEntryIndex, 1);

            const hmrClientIndex = entryImports.findIndex((value) =>
              /WebpackHMRClient\.js/.test(value)
            );
            entryImports.splice(hmrClientIndex, 0, refreshEntry);
          }
          entry[key].import = entryImports;
        }

        return entry;
      };

      if (typeof compiler.options.entry !== 'function') {
        compiler.options.entry = getAdjustedEntry(compiler.options.entry);
      } else {
        const getEntry = compiler.options.entry;
        compiler.options.entry = async () => {
          const entry = await getEntry();
          return getAdjustedEntry(entry);
        };
      }
    }
  }
}
