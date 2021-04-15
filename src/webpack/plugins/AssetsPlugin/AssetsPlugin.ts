import webpack from 'webpack';
import { WebpackPlugin } from '../../../types';
import { AssetResolver, AssetResolverConfig } from './AssetResolver';

/**
 * {@link AssetsPlugin} configuration options.
 */
export interface AssetsPluginConfig extends AssetResolverConfig {
  /**
   * Whether the development server is enabled.
   */
  devServerEnabled?: boolean;
}

/**
 * Plugin for loading and processing assets (images, audio, video etc) for
 * React Native applications.
 *
 * Assets processing in React Native differs from Web, Node.js or other targets. This plugin allows
 * you to use assets in the same way as you would do when using Metro.
 *
 * @category Webpack Plugin
 */
export class AssetsPlugin implements WebpackPlugin {
  /**
   * Constructs new `AssetsPlugin`.
   *
   * @param config Plugin configuration options.
   */
  constructor(private config: AssetsPluginConfig) {}

  /**
   * Apply the plugin.
   *
   * @param compiler Webpack compiler instance.
   */
  apply(compiler: webpack.Compiler) {
    const assetResolver = new AssetResolver(this.config, compiler);

    compiler.options.module.rules.push({
      test: assetResolver.config.test,
      use: [
        {
          loader: require.resolve('./assetsLoader.cjs'),
          options: {
            platform: this.config.platform,
            bundleToFile: !this.config.devServerEnabled,
          },
        },
      ],
    });
    compiler.options.resolve.plugins = (
      compiler.options.resolve.plugins || []
    ).concat(assetResolver);
  }
}
