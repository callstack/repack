import type { Compiler as RspackCompiler } from '@rspack/core';
import type { Compiler as WebpackCompiler } from 'webpack';
import { reanimatedModuleRules } from './rules.js';

export class ReanimatedPlugin {
  apply(compiler: RspackCompiler): void;
  apply(compiler: WebpackCompiler): void;

  apply(__compiler: unknown) {
    const compiler = __compiler as RspackCompiler;

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
