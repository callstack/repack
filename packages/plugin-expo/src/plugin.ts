import { resolve } from 'node:path';
import { ExpoModulesPlugin } from '@callstack/repack-plugin-expo-modules';
import type { Compiler as RspackCompiler } from '@rspack/core';
import type { Compiler as WebpackCompiler } from 'webpack';

interface ExpoRouterOptions {
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
  root?: string;
}

interface ExpoPluginOptions {
  /**
   * Project root directory.
   *
   * By default, it's set to the current working directory.
   */
  root?: string;

  /**
   * Wheter to enable Expo Router support.
   *
   * By default, it's disabled.
   *
   * If set to `true`, the default options will be used.
   * If you want to customize the options, pass an object with the desired options.
   *
   * @see ExpoRouterOptions
   */
  router?: boolean | ExpoRouterOptions;

  /**
   * Target application platform (e.g. `ios`, `android`).
   *
   * By default, the platform is inferred from `compiler.options.name` which is set by Re.Pack.
   */
  platform?: string;
}

export class ExpoPlugin {
  constructor(private options: ExpoPluginOptions = {}) {}

  resolveRouterOptions(projectRoot: string) {
    if (!this.options.router) {
      return null;
    }

    return typeof this.options.router === 'object'
      ? this.options.router
      : { baseUrl: '', root: resolve(projectRoot, 'app') };
  }

  apply(compiler: RspackCompiler): void;
  apply(compiler: WebpackCompiler): void;

  apply(__compiler: unknown) {
    const compiler = __compiler as RspackCompiler;

    const root = this.options.root ?? process.cwd();
    const router = this.resolveRouterOptions(root);

    const platform = this.options.platform ?? (compiler.options.name as string);

    // Apply Expo Modules support
    new ExpoModulesPlugin({ platform }).apply(compiler);

    new compiler.webpack.DefinePlugin({
      'process.env.EXPO_PROJECT_ROOT': JSON.stringify(root),
      // If Expo Router is enabled, pass additional environment variables
      ...(router
        ? {
            'process.env.EXPO_BASE_URL': JSON.stringify(router.baseUrl),
            'process.env.EXPO_ROUTER_ABS_APP_ROOT': JSON.stringify(router.root),
            'process.env.EXPO_ROUTER_APP_ROOT': JSON.stringify(router.root),
            'process.env.EXPO_ROUTER_IMPORT_MODE': JSON.stringify('sync'),
          }
        : {}),
    }).apply(compiler);

    // Add proxy configuration in development
    if (
      compiler.options.mode === 'development' &&
      !!compiler.options.devServer
    ) {
      compiler.options.devServer.proxy ??= [];

      // Redirect `/.expo/.virtual-metro-entry` to `/index` to match metro behavior in Expo managed projects
      compiler.options.devServer.proxy.push({
        context: ['/.expo/.virtual-metro-entry'],
        pathRewrite: { '^/.expo/.virtual-metro-entry': '/index' },
      });
    }
  }
}
