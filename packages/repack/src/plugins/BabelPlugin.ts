import type { Compiler as RspackCompiler } from '@rspack/core';
import type { Compiler as WebpackCompiler } from 'webpack';

export interface BabelPluginConfig {
  /** Target application platform, exposed to Re.Pack's Babel loaders. */
  platform?: string;
}

/**
 * Plugin that adds babel-loader fallback to resolveLoader configuration.
 * This ensures babel-loader can be resolved regardless of the package manager used,
 * as some package managers (like pnpm) require loaders to be direct dependencies
 * rather than allowing them to be resolved through nested dependencies.
 *
 * It also exposes the target platform to Re.Pack's Babel loaders, so they can
 * pass it to the Babel preset through caller data.
 *
 * @category Webpack Plugin
 */
export class BabelPlugin {
  constructor(private config: BabelPluginConfig = {}) {}

  apply(compiler: RspackCompiler): void;
  apply(compiler: WebpackCompiler): void;

  apply(__compiler: unknown) {
    const compiler = __compiler as RspackCompiler;
    compiler.options.resolveLoader = {
      ...compiler.options.resolveLoader,
      fallback: {
        ...compiler.options.resolveLoader?.fallback,
        'babel-loader': [require.resolve('babel-loader')],
      },
    };

    // `options.loader` values are copied onto every loader context, which is
    // the only channel that also reaches loaders running in Rspack's parallel
    // mode, where the compiler options are not available.
    const platform = this.config.platform ?? compiler.options.name;
    if (platform) {
      compiler.options.loader = {
        ...compiler.options.loader,
        repack: { ...compiler.options.loader?.repack, platform },
      };
    }
  }
}
