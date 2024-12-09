import type { Compiler, RspackPluginInstance } from '@rspack/core';
import packageJson from '../package.json' with { type: 'json' };
import { reanimatedModuleRules } from './rules';

export class pluginReanimated implements RspackPluginInstance {
  apply(compiler: Compiler) {
    // add alias for reanimated loader
    const aliases = compiler.options.resolveLoader.alias ?? {};
    const loaderPath = require.resolve('./loader');
    aliases[packageJson.name] = loaderPath;
    compiler.options.resolveLoader.alias = aliases;

    // add rules for transpiling wih repack-reanimated loader
    compiler.options.module.rules.push(reanimatedModuleRules);
  }
}
