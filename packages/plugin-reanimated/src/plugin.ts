import type { Compiler, RspackPluginInstance } from '@rspack/core';
// import packageJson from '../package.json';
import { moduleRules } from './rules';

export class pluginReanimated implements RspackPluginInstance {
  constructor() {
    console.log('pluginReanimated constructor');
  }

  apply(compiler: Compiler) {
    // // add alias for reanimated loader
    // const aliases = compiler.options.resolveLoader.alias ?? {};
    // aliases[packageJson.name] = require.resolve('./loader');
    // compiler.options.resolveLoader.alias = aliases;

    // add rules for transpiling wih babel-loader
    compiler.options.module.rules.push(moduleRules);
  }
}
