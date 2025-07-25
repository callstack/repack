import type { Compiler as RspackCompiler } from '@rspack/core';
import type { Compiler as WebpackCompiler } from 'webpack';

interface ExpoModulesPluginOptions {
  /**
   * Target application platform (e.g. `ios`, `android`).
   *
   * By default, the platform is inferred from `compiler.options.name` which is set by Re.Pack.
   */
  platform?: string;
}

export class ExpoModulesPlugin {
  constructor(private options: ExpoModulesPluginOptions = {}) {}

  apply(compiler: RspackCompiler): void;
  apply(compiler: WebpackCompiler): void;

  apply(__compiler: unknown) {
    const compiler = __compiler as RspackCompiler;

    const platform = this.options.platform ?? (compiler.options.name as string);

    // expo modules expect this to be defined in runtime
    new compiler.webpack.DefinePlugin({
      'process.env.EXPO_OS': JSON.stringify(platform),
    }).apply(compiler);
  }
}
