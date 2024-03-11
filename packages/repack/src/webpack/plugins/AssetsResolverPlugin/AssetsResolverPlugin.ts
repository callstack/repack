import rspack, { RspackPluginInstance } from '@rspack/core';
import {
  ASSET_EXTENSIONS,
  SCALABLE_ASSETS,
  getAssetExtensionsRegExp,
} from '../../utils/assetExtensions';
import { AssetResolver, AssetResolverConfig } from './AssetResolver';

/**
 * {@link AssetsResolverPlugin} configuration options.
 */
export interface AssetsResolverPluginConfig extends AssetResolverConfig {
  /**
   * Override default asset extensions. If the asset matches one of the extensions, it will be process
   * by the custom React Native asset resolver. Otherwise, the resolution will process normally and
   * the asset will be handled by Webpack.
   */
  extensions?: string[];
}

/**
 * Plugin for resolving assets (images, audio, video etc) for React Native applications.
 *
 * Assets processing in React Native differs from Web, Node.js or other targets.
 * This plugin in combination with `@callstack/repack/assets-loader` allows
 * you to use assets in the same way as you would do when using Metro.
 *
 * @category Webpack Plugin
 */
export class AssetsResolverPlugin implements RspackPluginInstance {
  /**
   * Constructs new `AssetsResolverPlugin`.
   *
   * @param config Plugin configuration options.
   */
  constructor(private config: AssetsResolverPluginConfig) {
    this.config.extensions = this.config.extensions ?? ASSET_EXTENSIONS;
    this.config.scalableExtensions =
      this.config.scalableExtensions ?? SCALABLE_ASSETS;
  }

  /**
   * Apply the plugin.
   *
   * @param compiler Webpack compiler instance.
   */
  apply(compiler: rspack.Compiler) {
    const assetResolver = new AssetResolver(this.config, compiler);
    const test = getAssetExtensionsRegExp(this.config.extensions!);
    /**
     * In rspack, resolve.plugins is not implemented yet, so we have to use normalModuleFactory instead.
     * We can intercept the asset resolution request and resolve it using our custom asset resolver.
     * This now done in a very hacky way using `beforeResolve` hook and should be changed in the future.
     *
     * TODO Refactor this
     */
    compiler.hooks.normalModuleFactory.tap('AssetsResolverPlugin', (nmf) => {
      nmf.hooks.beforeResolve.tapAsync(
        'AssetsResolverPlugin',
        (resolveData, callback) => {
          if (!test.test(resolveData.request)) {
            callback();
            return;
          } else {
            assetResolver.resolve(resolveData, callback);
          }
        }
      );
    });
  }
}
