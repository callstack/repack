import path from 'node:path';
import type { DevServerOptions } from '@callstack/repack-dev-server';
import type {
  EntryNormalized,
  Plugins,
  Compiler as RspackCompiler,
} from '@rspack/core';
import type { Compiler as WebpackCompiler } from 'webpack';
import {
  getRspackMajorVersionFromCompiler,
  isRspackCompiler,
  moveElementBefore,
} from '../helpers/index.js';

type PackageJSON = { version: string };

// matches the file conditions of Re.Pack's JS transform rules
// (includes .flow files, unlike the react-refresh plugin defaults)
const REACT_REFRESH_LOADER_TEST = /\.([cm]js|[jt]sx?|flow)$/i;
const REACT_REFRESH_LOADER_EXCLUDE = /node_modules/i;

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
export class DevelopmentPlugin {
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

  private resolveReactRefreshPluginRequest(context: string, request: string) {
    try {
      return require.resolve(request, { paths: [context] });
    } catch {
      try {
        // fallback to Re.Pack's own resolution paths
        return require.resolve(request);
      } catch {
        const error = new Error(
          '[RepackDevelopmentPlugin] ' +
            "Dependency named '@rspack/plugin-react-refresh' (version 2.x) is required " +
            'when using React Refresh with Rspack 2 but is not found in your project. ' +
            'Did you forget to install it?'
        );
        // remove the stack trace to make the error more readable
        error.stack = undefined;
        throw error;
      }
    }
  }

  /**
   * Sets up React Refresh using the official `@rspack/plugin-react-refresh` (v2)
   * with its integrator options: entry injection is left to Re.Pack (to control
   * placement per entrypoint) and the loader is swapped for Re.Pack's own
   * React Native-aware react-refresh-loader.
   *
   * The plugin package is ESM-only, so it's loaded lazily inside this branch -
   * it must never be evaluated on setups that don't support `require(esm)`
   * (webpack or Rspack 1 users on Node 18).
   *
   * @returns Path to the react-refresh entry module.
   */
  private setupOfficialReactRefresh(compiler: RspackCompiler): string {
    const pluginPath = this.resolveReactRefreshPluginRequest(
      compiler.context,
      '@rspack/plugin-react-refresh'
    );
    // Rspack 2 requires Node >= 20.19 (enforced by Re.Pack commands),
    // where require() of an ESM module is supported
    const { ReactRefreshRspackPlugin } = require(pluginPath);

    new ReactRefreshRspackPlugin({
      // entries are injected by Re.Pack per entrypoint to control their order
      injectEntry: false,
      // DevelopmentPlugin gates on devServer.hot already - don't let
      // the plugin second-guess based on `mode`
      forceEnable: true,
      reactRefreshLoader: '@callstack/repack/react-refresh-loader',
      test: REACT_REFRESH_LOADER_TEST,
      exclude: REACT_REFRESH_LOADER_EXCLUDE,
    }).apply(compiler);

    return this.resolveReactRefreshPluginRequest(
      compiler.context,
      '@rspack/plugin-react-refresh/react-refresh-entry'
    );
  }

  /**
   * Sets up React Refresh manually using the client runtime files vendored
   * from `@rspack/plugin-react-refresh` - used for webpack and Rspack 1
   * compilers, where the official v2 plugin cannot be applied.
   *
   * @returns Path to the react-refresh entry module.
   */
  private setupManualReactRefresh(compiler: RspackCompiler): string {
    const reactRefreshPath = require.resolve(
      '../modules/reactRefresh/reactRefresh.js'
    );
    const refreshUtilsPath = require.resolve(
      '../modules/reactRefresh/refreshUtils.js'
    );
    const reactRefreshEntryPath = require.resolve(
      '../modules/reactRefresh/reactRefreshEntry.js'
    );

    new compiler.webpack.ProvidePlugin({
      $ReactRefreshRuntime$: reactRefreshPath,
    }).apply(compiler);

    new compiler.webpack.DefinePlugin({
      __react_refresh_library__: JSON.stringify(
        compiler.webpack.Template.toIdentifier(
          compiler.options.output.uniqueName || compiler.options.output.library
        )
      ),
      // full reload on unrecoverable runtime errors is a web-oriented
      // behavior - in React Native errors are surfaced through LogBox
      __reload_on_runtime_errors__: false,
    }).apply(compiler);

    new compiler.webpack.ProvidePlugin({
      __react_refresh_utils__: refreshUtilsPath,
    }).apply(compiler);

    compiler.options.module.rules.unshift({
      test: REACT_REFRESH_LOADER_TEST,
      exclude: REACT_REFRESH_LOADER_EXCLUDE,
      use: '@callstack/repack/react-refresh-loader',
    });

    return reactRefreshEntryPath;
  }

  apply(compiler: RspackCompiler): void;
  apply(compiler: WebpackCompiler): void;

  apply(__compiler: unknown) {
    const compiler = __compiler as RspackCompiler;

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

      // alias react-refresh to Re.Pack's own copy to keep a single,
      // version-controlled instance of the refresh runtime
      const refreshPath = path.dirname(require.resolve('react-refresh'));
      compiler.options.resolve.alias = {
        'react-refresh': refreshPath,
        ...compiler.options.resolve.alias,
      };

      // Rspack 2 gets the official react-refresh plugin (driven through
      // its integrator options), webpack & Rspack 1 get manual wiring
      // based on the vendored client runtime files
      const rspackMajor = getRspackMajorVersionFromCompiler(compiler);
      const reactRefreshEntryPath =
        rspackMajor !== null && rspackMajor >= 2
          ? this.setupOfficialReactRefresh(compiler)
          : this.setupManualReactRefresh(compiler);

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
