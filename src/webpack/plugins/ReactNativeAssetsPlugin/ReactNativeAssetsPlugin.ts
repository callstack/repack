import path from 'path';
import webpack from 'webpack';
import { WebpackPlugin } from '../../../types';
import {
  ReactNativeAssetResolver,
  ReactNativeAssetResolverConfig,
} from './ReactNativeAssetResolver';

interface ReactNativeAssetsPluginConfig extends ReactNativeAssetResolverConfig {
  context: string;
  outputPath?: string;
  assetsOutputPath?: string;
  bundleToFile?: boolean;
}

export class ReactNativeAssetsPlugin implements WebpackPlugin {
  constructor(private config: ReactNativeAssetsPluginConfig) {}

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
