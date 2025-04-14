import type { Compiler } from '@rspack/core';
import {
  HermesBytecodePlugin,
  type HermesBytecodePluginConfig,
} from './HermesBytecodePlugin.js';

/**
 * @deprecated Use `HermesBytecodePlugin` instead.
 *
 * ChunksToHermesBytecodePlugin was renamed to HermesBytecodePlugin.
 * This is a deprecated alias that will be removed in the next major version.
 */
export class ChunksToHermesBytecodePlugin extends HermesBytecodePlugin {
  // biome-ignore lint/complexity/noUselessConstructor: needed for jsdocs
  constructor(config: HermesBytecodePluginConfig) {
    super(config);
  }

  apply(compiler: Compiler) {
    const logger = compiler.getInfrastructureLogger(
      'RepackChunksToHermesBytecodePlugin'
    );

    compiler.hooks.beforeCompile.tap(
      'RepackChunksToHermesBytecodePlugin',
      () => {
        logger.warn(
          'Notice: ChunksToHermesBytecodePlugin has been renamed ' +
            'and is now available as HermesBytecodePlugin. ' +
            'Please use HermesBytecodePlugin instead as this alias ' +
            'is deprecated and will be removed in the next major version.'
        );
      }
    );

    super.apply(compiler);
  }
}
