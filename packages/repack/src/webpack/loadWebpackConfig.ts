import rspack from '@rspack/core';
import { WebpackEnvOptions } from '../types';

type WebpackConfig =
  | rspack.Configuration
  | ((
      env: WebpackEnvOptions,
      argv: Record<string, any>
    ) => rspack.Configuration | Promise<rspack.Configuration>);

export async function loadWebpackConfig(
  webpackConfigPath: string,
  env: WebpackEnvOptions
) {
  let config: WebpackConfig;

  try {
    config = require(webpackConfigPath);
  } catch {
    config = await import(webpackConfigPath);
  }

  if ('default' in config) {
    config = (config as { default: WebpackConfig }).default;
  }

  if (typeof config === 'function') {
    return await config(env, {});
  }

  return config;
}
