import type { Compiler, RspackPluginInstance } from '@rspack/core';
import type { DevServerOptions } from '../types.js';
import { BabelPlugin } from './BabelPlugin.js';
import { CodegenPlugin } from './CodegenPlugin.js';
import { DevelopmentPlugin } from './DevelopmentPlugin.js';
import { LoggerPlugin, type LoggerPluginConfig } from './LoggerPlugin.js';
import { NativeEntryPlugin } from './NativeEntryPlugin.js';
import { OutputPlugin, type OutputPluginConfig } from './OutputPlugin/index.js';
import { RepackTargetPlugin } from './RepackTargetPlugin/index.js';

/**
 * {@link RepackPlugin} configuration options.
 */
export interface RepackPluginConfig {
  /** Context in which all resolution happens. Usually it's project root directory. */
  context: string;

  /** Compilation mode. */
  mode: 'development' | 'production';

  /** Target application platform. */
  platform: string;

  /**
   * Development server configuration options.
   * Used to configure `@callstack/repack-dev-server`.
   *
   * If `undefined`, then development server will not be used.
   */
  devServer?: DevServerOptions;

  /**
   * Whether source maps should be generated. Defaults to `true`.
   *
   * Setting this to `false`, disables any source map generation.
   */
  sourceMaps?: boolean;

  /**
   * Output options specifying where to save generated bundle, source map and assets.
   *
   * Refer to {@link OutputPluginConfig.output} for more details.
   */
  output: OutputPluginConfig['output'];

  /**
   * Absolute location to JS file with initialization logic for React Native.
   * Useful if you want to built for out-of-tree platforms.
   */
  initializeCore?: string;

  /**
   * Options specifying how to deal with extra chunks generated in the compilation,
   * usually by using dynamic `import(...)` function.
   *
   * Refer to {@link OutputPluginConfig.extraChunks} for more details.
   */
  extraChunks?: OutputPluginConfig['extraChunks'];

  /**
   * Options to configure {@link LoggerPlugin}'s `output`.
   *
   * Setting this to `false` disables {@link LoggerPlugin}.
   */
  logger?: LoggerPluginConfig['output'] | boolean;
}

/**
 * Webpack plugin, which abstracts configuration of other Re.Pack's plugin
 * to make Webpack config more readable.
 *
 * @example Usage in Webpack config (ESM):
 * ```ts
 * import * as Repack from '@callstack/repack';
 *
 * export default (env) => {
 *   const {
 *     mode = 'development',
 *     platform,
 *     devServer = undefined,
 *   } = env;
 *
 *   return {
 *     plugins: [
 *       new Repack.RepackPlugin({
 *         mode,
 *         platform,
 *         devServer,
 *       }),
 *     ],
 *   };
 * };
 * ```
 *
 * Internally, `RepackPlugin` configures the following plugins:
 * - `webpack.DefinePlugin` with `__DEV__` global
 * - {@link AssetsResolverPlugin}
 * - {@link OutputPlugin}
 * - {@link DevelopmentPlugin}
 * - {@link RepackTargetPlugin}
 * - `webpack.SourceMapDevToolPlugin`
 * - {@link LoggerPlugin}
 *
 * `RepackPlugin` provides a sensible defaults, but can be customized to some extent.
 * If you need more control, it's recommended to remove `RepackPlugin` and use other plugins
 * directly, eg:
 * ```ts
 * import * as Repack from '@callstack/repack';
 *
 * new Repack.plugins.AssetsResolverPlugin();
 * ```
 *
 * @category Webpack Plugin
 */
export class RepackPlugin implements RspackPluginInstance {
  /**
   * Constructs new `RepackPlugin`.
   *
   * @param config Plugin configuration options.
   */
  constructor(private config: RepackPluginConfig) {
    this.config.sourceMaps = this.config.sourceMaps ?? true;
    this.config.logger = this.config.logger ?? true;
  }

  /**
   * Apply the plugin.
   *
   * @param compiler Webpack compiler instance.
   */
  apply(compiler: Compiler) {
    new compiler.webpack.DefinePlugin({
      __DEV__: JSON.stringify(this.config.mode === 'development'),
    }).apply(compiler);

    new BabelPlugin().apply(compiler);

    new CodegenPlugin().apply(compiler);

    new OutputPlugin({
      platform: this.config.platform,
      enabled: !this.config.devServer,
      context: this.config.context,
      output: this.config.output,
      extraChunks: this.config.extraChunks,
    }).apply(compiler);

    new NativeEntryPlugin({
      initializeCoreLocation: this.config.initializeCore,
    }).apply(compiler);

    new RepackTargetPlugin({
      hmr: this.config.devServer?.hmr,
    }).apply(compiler);

    new DevelopmentPlugin({
      devServer: this.config.devServer,
      platform: this.config.platform,
    }).apply(compiler);

    if (this.config.sourceMaps) {
      // TODO Fix sourcemap directory structure
      // Right now its very messy and not every node module is inside of the node module
      // like React Devtools backend etc or some symilinked module appear with relative path
      // We should normalize this through a custom handler and provide an output similar to Metro
      new compiler.webpack.SourceMapDevToolPlugin({
        test: /\.(js)?bundle$/,
        filename: '[file].map',
        append: `//# sourceMappingURL=[url]?platform=${this.config.platform}`,
        module: true,
        columns: true,
        noSources: false,
        namespace:
          compiler.options.output.devtoolNamespace ??
          compiler.options.output.uniqueName,
      }).apply(compiler);
    }

    if (this.config.logger) {
      new LoggerPlugin({
        platform: this.config.platform,
        devServerEnabled: Boolean(this.config.devServer),
        output: {
          console: true,
          ...(typeof this.config.logger === 'object' ? this.config.logger : {}),
        },
      }).apply(compiler);
    }
  }
}
