import type { Compiler, RspackPluginInstance } from '@rspack/core';
import ReactRefreshPlugin from '@rspack/plugin-react-refresh';
import type { DevServerOptions } from '../types';
import { isRspackCompiler } from './utils/isRspackCompiler';

type PackageJSON = { version: string };
/**
 * {@link DevelopmentPlugin} configuration options.
 */
export interface DevelopmentPluginConfig {
  entryName?: string;
  platform: string;
  devServer?: DevServerOptions;
}

/**
 * Class for running development server that handles serving the built bundle, all assets as well as
 * providing Hot Module Replacement functionality.
 *
 * @category Webpack Plugin
 */
export class DevelopmentPlugin implements RspackPluginInstance {
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
  apply(compiler: Compiler) {
    if (!this.config?.devServer) {
      return;
    }

    const reactNativePackageJson: PackageJSON = require('react-native/package.json');
    const [majorVersion, minorVersion, patchVersion] =
      reactNativePackageJson.version.split('-')[0].split('.');

    new compiler.webpack.DefinePlugin({
      __PLATFORM__: JSON.stringify(this.config.platform),
      __PUBLIC_PROTOCOL__: this.config.devServer.https ? '"https"' : '"http"',
      __PUBLIC_HOST__: JSON.stringify(this.config.devServer.host),
      __PUBLIC_PORT__: Number(this.config.devServer.port),
      __REACT_NATIVE_MAJOR_VERSION__: Number(majorVersion),
      __REACT_NATIVE_MINOR_VERSION__: Number(minorVersion),
      __REACT_NATIVE_PATCH_VERSION__: Number(patchVersion),
    }).apply(compiler);

    // Enforce output filenames in development mode
    compiler.options.output.filename = (pathData) =>
      pathData.chunk?.name === 'main' ? 'index.bundle' : '[name].bundle';
    compiler.options.output.chunkFilename = '[name].chunk.bundle';

    if (this.config?.devServer.hmr) {
      // setup HMR
      new compiler.webpack.HotModuleReplacementPlugin().apply(compiler);

      // add react-refresh-loader fallback for compatibility with Webpack
      compiler.options.resolveLoader = {
        ...compiler.options.resolveLoader,
        fallback: {
          ...compiler.options.resolveLoader?.fallback,
          'builtin:react-refresh-loader': require.resolve(
            '../loaders/reactRefreshCompatLoader'
          ),
        },
      };

      // setup HMR source maps
      new compiler.webpack.SourceMapDevToolPlugin({
        test: /\.hot-update\.js$/,
        filename: '[file].map',
        append: `//# sourceMappingURL=[url]?platform=${this.config.platform}`,
        module: true,
        columns: true,
        noSources: false,
      }).apply(compiler);

      new ReactRefreshPlugin({ overlay: false }).apply(compiler);

      const devEntries = [
        require.resolve('../modules/configurePublicPath'),
        require.resolve('../modules/WebpackHMRClient'),
      ];

      // TODO (jbroma): refactor this to be more maintainable
      // This is a very hacky way to reorder entrypoints, and needs to be done differently
      // depending on the compiler type (rspack/webpack)
      if (isRspackCompiler(compiler)) {
        // Add entries after the rspack MF entry is added during `hook.afterPlugins` stage
        compiler.hooks.initialize.tap(
          { name: 'DevelopmentPlugin', stage: 200 },
          () => {
            for (const entry of devEntries) {
              new compiler.webpack.EntryPlugin(compiler.context, entry, {
                name: undefined,
              }).apply(compiler);
            }
          }
        );
      } else {
        if (!this.config.entryName) {
          // Add dev entries as global entries
          for (const entry of devEntries) {
            new compiler.webpack.EntryPlugin(compiler.context, entry, {
              name: undefined,
            }).apply(compiler);
          }
        } else {
          if (typeof compiler.options.entry === 'function') {
            // TODO (jbroma): Support function entry points?
            throw new Error(
              'DevelopmentPlugin is not compatible with function entry points'
            );
          }

          const entries =
            compiler.options.entry[this.config.entryName].import ?? [];
          const scriptManagerEntryIndex = entries.findIndex((entry) =>
            entry.includes('InitializeScriptManager')
          );

          if (scriptManagerEntryIndex !== -1) {
            // Insert devEntries after 'InitializeScriptManager'
            compiler.options.entry[this.config.entryName].import = [
              ...entries.slice(0, scriptManagerEntryIndex + 1),
              ...devEntries,
              ...entries.slice(scriptManagerEntryIndex + 1),
            ];
          } else {
            // 'InitializeScriptManager' entry not found, insert devEntries before the normal entries
            compiler.options.entry[this.config.entryName].import = [
              ...devEntries,
              ...entries,
            ];
          }
        }
      }
    }
  }
}
