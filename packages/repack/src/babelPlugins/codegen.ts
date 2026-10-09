import type { ConfigAPI, PluginObj } from '@babel/core';
import { resolveReactNativeCodegenPlugin } from '../helpers/resolveBabelPlugins.js';

export default function codegen(
  api: ConfigAPI,
  options: Record<string, unknown>,
  dirname: string
): PluginObj {
  const pluginModule = require(resolveReactNativeCodegenPlugin(dirname));
  const codegenPlugin = pluginModule.default ?? pluginModule;

  return codegenPlugin(api, options, dirname);
}
