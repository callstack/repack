import type { Compiler, RspackPluginInstance } from '@rspack/core';
import { reanimatedModuleRules } from './rules.ts';

export class ReanimatedPlugin implements RspackPluginInstance {
  apply(compiler: Compiler) {
    // add rules for transpiling wih reanimated loader
    compiler.options.module.rules.push(reanimatedModuleRules);

    // ignore the 'setUpTests' warning from reanimated which is not relevant
    compiler.options.ignoreWarnings = compiler.options.ignoreWarnings ?? [];
    compiler.options.ignoreWarnings.push((warning) =>
      /'`setUpTests` is available only in Jest environment\.'/.test(
        warning.message
      )
    );
  }
}
