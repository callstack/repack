import path from 'path';
import webpack from 'webpack';
import { WebpackPlugin } from '../../../types';
import {
  ReactNativeAssetResolver,
  ReactNativeAssetResolverConfig,
} from './ReactNativeAssetResolver';

/**
 * {@link ReactNativeAssetsPlugin} configuration options.
 */
export interface ReactNativeAssetsPluginConfig
  extends ReactNativeAssetResolverConfig {
  /** Context in which all resolution happens. Usually it's project root directory. */
  context: string;
  /**
   * Bundle output path - directory where built bundle will be saved.
   * If not provided it will be inferred from Webpack configuration.
   */
  outputPath?: string;
  /**
   * Directory where all assets (eg: images, video, audio) should be saved.
   * If not provided, all assets will be saved in the same directory as {@link outputPath}.
   */
  assetsOutputPath?: string;
  /**
   * Whether the build produces static bundle saved to file or
   * the bundle will be updated multiple times and resides in memory.
   *
   * __When development server is running, `bundleToFile` should be set to `false`.__
   */
  bundleToFile?: boolean;
}

/**
 * Plugin for loading and processing assets (images, audio, video etc) for
 * React Native applications.
 *
 * Assets processing in React Native differs from Web, Node.js or other targets. This plugin allows
 * you to use assets in the same way as you would do when using Metro.
 */
export class ReactNativeAssetsPlugin implements WebpackPlugin {
  /**
   * Constructs new `ReactNativeAssetsPlugin`.
   *
   * @param config Plugin configuration options.
   */
  constructor(private config: ReactNativeAssetsPluginConfig) {}

  /**
   * Apply the plugin.
   *
   * @param compiler Webpack compiler instance.
   */
  apply(compiler: webpack.Compiler) {
    const assetResolver = new ReactNativeAssetResolver(this.config, compiler);

    let outputPath: string | undefined;
    if (this.config.assetsOutputPath) {
      const baseOutputPath =
        this.config.outputPath || compiler.options.output.path;
      if (!baseOutputPath) {
        throw new Error(
          '`outputPath` or `output.path` in Webpack config must be specified when using custom `assetsOutputPath`'
        );
      }

      outputPath = path.relative(baseOutputPath, this.config.assetsOutputPath);
    }

    compiler.options.module.rules.push({
      test: assetResolver.config.test,
      use: [
        {
          loader: require.resolve('./reactNativeAssetsLoader.cjs'),
          options: {
            platform: this.config.platform,
            context: this.config.context,
            outputPath,
            bundleToFile: this.config.bundleToFile ?? true,
          },
        },
      ],
    });
    compiler.options.resolve.plugins = (
      compiler.options.resolve.plugins || []
    ).concat(assetResolver);
  }
}
