import path from 'path';
import webpack from 'webpack';
import type { DevServerOptions, WebpackPlugin } from '../../types';
import { AssetsResolverPlugin } from './AssetsResolverPlugin';
import { DevelopmentPlugin } from './DevelopmentPlugin';
import { LoggerPlugin, LoggerPluginConfig } from './LoggerPlugin';
import { OutputPlugin, OutputPluginConfig } from './OutputPlugin';
import { RepackTargetPlugin } from './RepackTargetPlugin';

/**
 * {@link RepackPlugin} configuration options.
 */
export interface RepackPluginConfig {
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

  /** TODO */
  sourceMaps?: boolean;

  /** TODO */
  output?: Pick<
    OutputPluginConfig,
    'localChunks' | 'remoteChunksOutput' | 'entry'
  >;

  /** TODO */
  logger?: LoggerPluginConfig['output'] | boolean;
}

/**
 * TODO
 *
 * @category Webpack Plugin
 */
export class RepackPlugin implements WebpackPlugin {
  constructor(private config: RepackPluginConfig) {
    this.config.sourceMaps = this.config.sourceMaps ?? true;
    this.config.logger = this.config.logger ?? true;
  }

  /**
   * Apply the plugin.
   *
   * @param compiler Webpack compiler instance.
   */
  apply(compiler: webpack.Compiler) {
    new webpack.DefinePlugin({
      __DEV__: JSON.stringify(this.config.mode === 'development'),
    }).apply(compiler);

    new AssetsResolverPlugin({
      platform: this.config.platform,
    }).apply(compiler);

    new OutputPlugin({
      platform: this.config.platform,
      devServerEnabled: Boolean(this.config.devServer),
      localChunks: [/Async/],
      remoteChunksOutput: path.join(
        __dirname,
        'build',
        this.config.platform,
        'remote'
      ),
      ...this.config.output,
    });

    new DevelopmentPlugin({
      platform: this.config.platform,
      devServer: this.config.devServer,
    }).apply(compiler);

    new RepackTargetPlugin().apply(compiler);

    if (this.config.sourceMaps) {
      new webpack.SourceMapDevToolPlugin({
        test: /\.(js)?bundle$/,
        exclude: /\.chunk\.(js)?bundle$/,
        filename: '[file].map',
        append: `//# sourceMappingURL=[url]?platform=${this.config.platform}`,
      }).apply(compiler);

      new webpack.SourceMapDevToolPlugin({
        test: /\.(js)?bundle$/,
        include: /\.chunk\.(js)?bundle$/,
        filename: '[file].map',
        append: `//# sourceMappingURL=[url]?platform=${this.config.platform}`,
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
