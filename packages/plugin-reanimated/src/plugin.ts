import type { Compiler, RspackPluginInstance } from '@rspack/core';

export class pluginReanimated implements RspackPluginInstance {
  constructor() {
    console.log('pluginReanimated constructor');
  }

  apply(compiler: Compiler) {
    console.log(compiler);
  }
}
