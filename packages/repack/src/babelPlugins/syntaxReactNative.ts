import type { ConfigAPI, PluginObj } from '@babel/core';
import { resolveReactNativeParser } from '../helpers/resolveReactNativeParser.js';

export default function syntaxReactNative(
  api: ConfigAPI,
  options: Record<string, unknown>,
  dirname: string
): PluginObj {
  const { babelPluginPath } = resolveReactNativeParser(dirname);
  const pluginModule = require(babelPluginPath);
  const syntaxPlugin = pluginModule.default ?? pluginModule;

  return syntaxPlugin(api, options, dirname);
}
