import path from 'node:path';
import { getDirname } from '@callstack/repack';
import type { Compiler, RspackPluginInstance } from '@rspack/core';
import { reanimatedModuleRules } from './rules.js';

const dirname = getDirname(import.meta.url);

export class pluginReanimated implements RspackPluginInstance {
  apply(compiler: Compiler) {
    // add alias for reanimated loader
    const aliases = compiler.options.resolveLoader.alias ?? {};
    const loaderPath = path.resolve(dirname, './loader.js');
    aliases['@callstack/repack-plugin-reanimated'] = loaderPath;
    compiler.options.resolveLoader.alias = aliases;

    // add rules for transpiling wih repack-reanimated loader
    compiler.options.module.rules.push(reanimatedModuleRules);
  }
}
