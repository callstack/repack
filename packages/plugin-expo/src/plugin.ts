import { resolve } from 'node:path';
import { ExpoModulesPlugin } from '@callstack/repack-plugin-expo-modules';
import type { Compiler as RspackCompiler } from '@rspack/core';
import type { Compiler as WebpackCompiler } from 'webpack';

interface ExpoPluginOptions {
  /**
   * Base URL for the Expo Router.
   *
   * By default, it's set to an empty string.
   */
  baseUrl?: string;

  /**
   * Routes root directory.
   *
   * By default, it's set to <projectRoot>/app (which is the default for Expo Router).
   * It should match the `root` option in your `expo-router` `app.json` plugin configuration.
   *
   * @see https://docs.expo.dev/router/reference/src-directory/#custom-directory
   */
  routesRoot?: string;

  /**
   * Project root directory.
   *
   * By default, it's set to the current working directory.
   */
  projectRoot?: string;

  /**
   * Target application platform (e.g. `ios`, `android`).
   *
   * By default, the platform is inferred from `compiler.options.name` which is set by Re.Pack.
   */
  platform?: string;
}

export class ExpoPlugin {
  constructor(private options: ExpoPluginOptions = {}) {}

  apply(compiler: RspackCompiler): void;
  apply(compiler: WebpackCompiler): void;

  apply(__compiler: unknown) {
    const compiler = __compiler as RspackCompiler;

    const baseUrl = this.options.baseUrl ?? '';
    const projectRoot = this.options.projectRoot ?? process.cwd();
    const routesRoot = this.options.routesRoot ?? resolve(projectRoot, 'app');

    const platform = this.options.platform ?? (compiler.options.name as string);

    // apply expo modules plugin
    new ExpoModulesPlugin({ platform }).apply(compiler);

    // expo router expect this to be defined in runtime
    new compiler.webpack.DefinePlugin({
      'process.env.EXPO_BASE_URL': JSON.stringify(baseUrl),
      'process.env.EXPO_PROJECT_ROOT': JSON.stringify(projectRoot),
      'process.env.EXPO_ROUTER_ABS_APP_ROOT': JSON.stringify(routesRoot),
      'process.env.EXPO_ROUTER_APP_ROOT': JSON.stringify(routesRoot),
      'process.env.EXPO_ROUTER_IMPORT_MODE': JSON.stringify('sync'),
    }).apply(compiler);

    // add proxy configuration in development
    if (
      compiler.options.mode === 'development' &&
      !!compiler.options.devServer
    ) {
      compiler.options.devServer.proxy ??= [];

      // redirect `/.expo/.virtual-metro-entry` to `/index` to match metro behavior in Expo managed projects
      compiler.options.devServer.proxy.push({
        context: ['/.expo/.virtual-metro-entry'],
        pathRewrite: { '^/.expo/.virtual-metro-entry': '/index' },
      });
    }
  }
}
