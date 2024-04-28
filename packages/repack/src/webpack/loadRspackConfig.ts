import rspack from '@rspack/core';
import { WebpackEnvOptions } from '../types';

type RspackConfig =
  | rspack.Configuration
  | ((
      env: WebpackEnvOptions,
      argv: Record<string, any>
    ) => rspack.Configuration | Promise<rspack.Configuration>);

export async function loadRspackConfig(
  webpackConfigPath: string,
  env: WebpackEnvOptions
): Promise<rspack.Configuration> {
  let config: RspackConfig;

  try {
    config = require(webpackConfigPath);
  } catch {
    config = await import(webpackConfigPath);
  }

  if ('default' in config) {
    config = (config as { default: RspackConfig }).default;
  }

  if (typeof config === 'function') {
    return await config(env, {});
  }

  return config;
}
