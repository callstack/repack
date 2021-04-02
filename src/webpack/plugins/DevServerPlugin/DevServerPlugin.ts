import webpack from 'webpack';
import ReactRefreshPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import { WebpackPlugin } from '../../../types';
import { DevServer, DevServerConfig } from '../../../server';

type ExtractEntryStaticNormalized<E> = E extends () => Promise<infer U>
  ? U
  : E extends { [key: string]: any }
  ? E
  : never;

type EntryStaticNormalized = ExtractEntryStaticNormalized<webpack.EntryNormalized>;

/**
 * {@link DevServerPlugin} configuration options.
 */
export interface DevServerPluginConfig extends DevServerConfig {
  /** Whether to run development server or not. */
  enabled?: boolean;
  /**
   * Whether Hot Module Replacement / React Refresh should be enabled. Defaults to `true`.
   */
  hmr?: boolean;
}

/**
 * Class for running development server that handles serving the built bundle, all assets as well as
 * providing Hot Module Replacement functionality.
 *
 * @category Webpack Plugin
 */
export class DevServerPlugin implements WebpackPlugin {
  /**
   * Constructs new `DevServerPlugin`.
   *
   * @param config Plugin configuration options.
   */
  constructor(private config: DevServerPluginConfig) {
    this.config.hmr = this.config?.hmr ?? true;
    this.config.enabled = this.config.enabled ?? true;
  }

  /**
   * Apply the plugin.
   *
   * @param compiler Webpack compiler instance.
   */
  apply(compiler: webpack.Compiler) {
    new webpack.DefinePlugin({
      'process.env.__PUBLIC_PATH__': JSON.stringify(
        compiler.options.output.publicPath
      ),
      'process.env.__PUBLIC_PORT__': JSON.stringify(this.config.port),
    }).apply(compiler);

    if (this.config?.hmr) {
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

    let server: DevServer | undefined;

    compiler.hooks.watchRun.tapPromise('DevServerPlugin', async () => {
      if (!server && this.config.enabled) {
        server = new DevServer(this.config, compiler);
        await server.run();
      }
    });
  }
}
