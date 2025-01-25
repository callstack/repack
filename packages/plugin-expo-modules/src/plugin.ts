import type { Compiler, RspackPluginInstance } from '@rspack/core';

interface ExpoModulesPluginOptions {
  /**
   * Target application platform (e.g. `ios`, `android`).
   *
   * By default, the platform is inferred from `compiler.name` which is set by Re.Pack.
   */
  platform?: string;
}

export class ExpoModulesPlugin implements RspackPluginInstance {
  constructor(private options: ExpoModulesPluginOptions = {}) {}

  apply(compiler: Compiler) {
    const platform = this.options.platform ?? compiler.name;

    // expo modules expect this to be defined in runtime
    new compiler.webpack.DefinePlugin({
      'process.env.EXPO_OS': JSON.stringify(platform),
    });
  }
}
