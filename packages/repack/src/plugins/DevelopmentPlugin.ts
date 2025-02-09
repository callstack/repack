import path from 'node:path';
import type {
  Compiler,
  EntryNormalized,
  Plugins,
  RspackPluginInstance,
} from '@rspack/core';
import ReactRefreshPlugin from '@rspack/plugin-react-refresh';
import type { DevServerOptions } from '../types.js';
import { isRspackCompiler } from './utils/isRspackCompiler.js';
import { moveEntryDependencyBefore } from './utils/moveEntryDependencyBefore.js';

const [reactRefreshEntryPath, reactRefreshPath, refreshUtilsPath] =
  ReactRefreshPlugin.deprecated_runtimePaths;

type PackageJSON = { version: string };
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
export class DevelopmentPlugin implements RspackPluginInstance {
  /**
   * Constructs new `DevelopmentPlugin`.
   *
   * @param config Plugin configuration options.
   */
  constructor(private config?: DevelopmentPluginConfig) {}

  private getEntryNormalizedEntryChunks(entryNormalized: EntryNormalized) {
    if (typeof entryNormalized === 'function') {
      throw new Error(
        '[RepackDevelopmentPlugin] Dynamic entry (function) is not supported.'
      );
    }

    return Object.keys(entryNormalized).map(
      (name) => entryNormalized[name].runtime || name
    );
  }

  private getModuleFederationEntryChunks(plugins: Plugins) {
    const entrypoints = plugins.map((plugin) => {
      if (typeof plugin !== 'object' || !plugin) {
        return;
      }

      if (!plugin.constructor?.name.startsWith('ModuleFederationPlugin')) {
        return;
      }

      // repack MF plugins expose config property
      if ('config' in plugin) {
        return plugin.config.name;
      }

      // official MF plugins expose _options property
      if ('_options' in plugin) {
        return plugin._options.name;
      }

      return null;
    });

    return entrypoints.filter(Boolean);
  }

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
            '../loaders/reactRefreshLoader'
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
        namespace:
          compiler.options.output.devtoolNamespace ??
          compiler.options.output.uniqueName,
      }).apply(compiler);

      // setup React Refresh manually instead of using the official plugin
      // to avoid issues with placement of reactRefreshEntry
      new compiler.webpack.ProvidePlugin({
        $ReactRefreshRuntime$: reactRefreshPath,
      }).apply(compiler);

      new compiler.webpack.DefinePlugin({
        __react_refresh_error_overlay__: false,
        __react_refresh_socket__: false,
        __react_refresh_library__: JSON.stringify(
          compiler.webpack.Template.toIdentifier(
            compiler.options.output.uniqueName ||
              compiler.options.output.library
          )
        ),
      }).apply(compiler);

      new compiler.webpack.ProvidePlugin({
        __react_refresh_utils__: refreshUtilsPath,
      }).apply(compiler);

      const refreshPath = path.dirname(require.resolve('react-refresh'));
      compiler.options.resolve.alias = {
        'react-refresh': refreshPath,
        ...compiler.options.resolve.alias,
      };

      compiler.options.module.rules.unshift({
        include: /\.([cm]js|[jt]sx?|flow)$/i,
        exclude: /node_modules/i,
        use: 'builtin:react-refresh-loader',
      });

      const devEntries = [
        reactRefreshEntryPath,
        require.resolve('../modules/configurePublicPath.js'),
        require.resolve('../modules/WebpackHMRClient.js'),
      ];

      compiler.hooks.entryOption.tap(
        { name: 'DevelopmentPlugin' },
        (_, entryNormalized) => {
          // combine entries for all declared and MF entrypoints
          const entrypoints = [
            ...this.getEntryNormalizedEntryChunks(entryNormalized),
            ...this.getModuleFederationEntryChunks(compiler.options.plugins),
          ];

          // add development entries to all combined entrypoints
          entrypoints.forEach((entryName) => {
            for (const devEntry of devEntries) {
              new compiler.webpack.EntryPlugin(compiler.context, devEntry, {
                name: entryName,
              }).apply(compiler);
            }
          });
        }
      );

      // React Refresh requires setImmediate to be defined
      // but in React Native it happens during InitializeCore so we need
      // to shim it here to prevent ReferenceError
      // TODO (jbroma): add this check to reactRefreshLoader
      new compiler.webpack.EntryPlugin(
        compiler.context,
        'data:text/javascript,globalThis.setImmediate = globalThis.setImmediate || function(){ /* noop */ };',
        { name: undefined }
      ).apply(compiler);

      if (!isRspackCompiler(compiler)) {
        // In Webpack, Module Federation Container entry gets injected during the compilation's make phase,
        // similar to how dynamic entries work. This means the federation entry is added after our development entries.
        // We need to reorder dependencies to ensure federation entry is placed before development entries.
        compiler.hooks.make.tap(
          { name: 'DevelopmentPlugin', stage: 1000 },
          (compilation) => {
            for (const entry of compilation.entries.values()) {
              moveEntryDependencyBefore(entry.dependencies, {
                dependencyToMove: '.federation/entry',
                beforeDependency: devEntries[0],
              });
            }
          }
        );
      }
    }
  }
}
