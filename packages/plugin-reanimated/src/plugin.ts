import type { Compiler, RspackPluginInstance } from '@rspack/core';
import { reanimatedModuleRules } from './rules.js';

export class ReanimatedPlugin implements RspackPluginInstance {
  apply(compiler: Compiler) {
    // add rules for transpiling wih reanimated loader
    compiler.options.module.rules.push(reanimatedModuleRules);
  }
}
