import path from 'node:path';
import type { DevServerOptions } from '@callstack/repack-dev-server';
import type {
  Compiler,
  EntryNormalized,
  Plugins,
  RspackPluginInstance,
} from '@rspack/core';
import ReactRefreshPlugin from '@rspack/plugin-react-refresh';
import { isRspackCompiler } from './utils/isRspackCompiler.js';
import { moveElementBefore } from './utils/moveElementBefore.js';

const [reactRefreshEntryPath, reactRefreshPath, refreshUtilsPath] =
  ReactRefreshPlugin.deprecated_runtimePaths;

type PackageJSON = { version: string };
/**
 * {@link DevelopmentPlugin} configuration options.
 */
export interface DevelopmentPluginConfig {
  /**
   * Target application platform.
   */
  platform?: string;
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
  constructor(private config: DevelopmentPluginConfig) {}

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
      if ('config' in plugin && !!plugin.config.exposes) {
        return plugin.config.name;
      }

      // official MF plugins expose _options property
      if ('_options' in plugin && !!plugin.config.exposes) {
        return plugin._options.name;
      }

      return;
    });

    return entrypoints.filter(Boolean);
  }

  private getProtocolType(devServer: DevServerOptions) {
    if (typeof devServer.server === 'string') {
      return devServer.server;
    }

    if (typeof devServer.server?.type === 'string') {
      return devServer.server.type;
    }

    return 'http';
  }

  /**
   * Apply the plugin.
   *
   * @param compiler Webpack compiler instance.
   */
  apply(compiler: Compiler) {
    if (!compiler.options.devServer) {
      return;
    }

    const reactNativePackageJson: PackageJSON = require('react-native/package.json');
    const [majorVersion, minorVersion, patchVersion] =
      reactNativePackageJson.version.split('-')[0].split('.');

    const host = compiler.options.devServer.host;
    const port = compiler.options.devServer.port;
    // @ts-expect-error: devServertypes here are not being overridden properly
    const protocol = this.getProtocolType(compiler.options.devServer);
    const platform = this.config.platform ?? (compiler.options.name as string);

    new compiler.webpack.DefinePlugin({
      __PLATFORM__: JSON.stringify(platform),
      __PUBLIC_PROTOCOL__: JSON.stringify(protocol),
      __PUBLIC_HOST__: JSON.stringify(host),
      __PUBLIC_PORT__: Number(port),
      __REACT_NATIVE_MAJOR_VERSION__: Number(majorVersion),
      __REACT_NATIVE_MINOR_VERSION__: Number(minorVersion),
      __REACT_NATIVE_PATCH_VERSION__: Number(patchVersion),
    }).apply(compiler);

    if (compiler.options.devServer.hot) {
      // setup HMR
      new compiler.webpack.HotModuleReplacementPlugin().apply(compiler);

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
        use: '@callstack/repack/react-refresh-loader',
      });

      const devEntries = [
        reactRefreshEntryPath,
        require.resolve('../modules/configurePublicPath.js'),
        require.resolve('../modules/WebpackHMRClient.js'),
      ];

      compiler.hooks.entryOption.tap(
        { name: 'RepackDevelopmentPlugin' },
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

      if (!isRspackCompiler(compiler)) {
        // In Webpack, Module Federation Container entry gets injected during the compilation's make phase,
        // similar to how dynamic entries work. This means the federation entry is added after our development entries.
        // We need to reorder dependencies to ensure federation entry is placed before development entries.
        compiler.hooks.make.tap(
          { name: 'RepackDevelopmentPlugin', stage: 1000 },
          (compilation) => {
            for (const entry of compilation.entries.values()) {
              moveElementBefore(entry.dependencies, {
                elementToMove: /\.federation\/entry/,
                beforeElement: devEntries[0],
                getElement: (dependency) => dependency.request ?? '',
              });
            }
          }
        );
      }
    }
  }
}
