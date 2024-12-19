import type { Compiler, RspackPluginInstance } from '@rspack/core';
import { nativeWindModuleRules } from './rules.js';

export interface NativeWindPluginConfig {
  input: string;
}

export class NativeWindPlugin implements RspackPluginInstance {
  private input: string;

  constructor(pluginConfig: NativeWindPluginConfig) {
    if (!pluginConfig || typeof pluginConfig.input !== 'string') {
      throw new Error('NativeWindPlugin requires an "input" string option.');
    }
    this.input = pluginConfig.input;
  }

  apply(compiler: Compiler) {
    // add rules for transpiling wih NativeWind loader
    compiler.options.module.rules.push(nativeWindModuleRules);

    compiler.hooks.compilation.tap('NativeWindPlugin', (_compilation) => {
      console.log('The Rspack build process is starting!');
    });

    // TODO: do something
  }
}
