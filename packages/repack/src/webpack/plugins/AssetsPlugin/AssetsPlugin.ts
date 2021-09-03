import webpack from 'webpack';
import { WebpackPlugin } from '../../../types';
import {
  ASSET_EXTENSIONS,
  getAssetExtensionsRegExp,
  SCALABLE_ASSETS,
} from './assetExtensions';
import { AssetResolver, AssetResolverConfig } from './AssetResolver';

/** A path to a Re.Pack's asset loader. */
export const ASSET_LOADER = require.resolve('./assetsLoader.cjs');

/**
 * {@link AssetsPlugin} configuration options.
 */
export interface AssetsPluginConfig extends AssetResolverConfig {
  /**
   * Whether the development server is enabled.
   */
  devServerEnabled?: boolean;

  /**
   * Whether `AssetsPlugin` should configure asset loader automatically.
   *
   * Set to `false` if you want to configure it manually, for example if you are using
   * `@svgr/webpack`.
   */
  configureLoader?: boolean;
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
  constructor(private config: AssetsPluginConfig) {
    this.config.configureLoader = this.config.configureLoader ?? true;
    this.config.extensions = this.config.extensions ?? ASSET_EXTENSIONS;
    this.config.scalableExtensions =
      this.config.scalableExtensions ?? SCALABLE_ASSETS;
  }

  /**
   * Apply the plugin.
   *
   * @param compiler Webpack compiler instance.
   */
  apply(compiler: webpack.Compiler) {
    const assetResolver = new AssetResolver(this.config, compiler);

    if (this.config.configureLoader) {
      compiler.options.module.rules.push({
        test: getAssetExtensionsRegExp(assetResolver.config.extensions!),
        use: [
          {
            loader: ASSET_LOADER,
            options: {
              platform: this.config.platform,
              scalableAssetExtensions: SCALABLE_ASSETS,
              devServerEnabled: this.config.devServerEnabled,
            },
          },
        ],
      });
    }
    compiler.options.resolve.plugins = (
      compiler.options.resolve.plugins || []
    ).concat(assetResolver);
  }
}
