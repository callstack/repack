import type { Compiler, RspackPluginInstance } from '@rspack/core';

interface ExpoModulesPluginOptions {
  /**
   * Target application platform (e.g. `ios`, `android`).
   *
   * By default, the platform is inferred from `compiler.options.name` which is set by Re.Pack.
   */
  platform?: string;
}

export class ExpoModulesPlugin implements RspackPluginInstance {
  constructor(private options: ExpoModulesPluginOptions = {}) {}

  apply(compiler: Compiler) {
    const platform = this.options.platform ?? (compiler.options.name as string);

    // expo modules expect this to be defined in runtime
    new compiler.webpack.DefinePlugin({
      'process.env.EXPO_OS': JSON.stringify(platform),
    }).apply(compiler);
  }
}
