import rspack from '@rspack/core';
import { WebpackEnvOptions } from '../types';

type RspackConfig =
  | rspack.Configuration
  | ((
      env: WebpackEnvOptions,
      argv: Record<string, any>
    ) => rspack.Configuration | Promise<rspack.Configuration>);

export async function loadConfig(
  configFilePath: string,
  env: WebpackEnvOptions
): Promise<rspack.Configuration> {
  let config: RspackConfig;

  try {
    config = require(configFilePath);
  } catch {
    config = await import(configFilePath);
  }

  if ('default' in config) {
    config = (config as { default: RspackConfig }).default;
  }

  if (typeof config === 'function') {
    return await config(env, {});
  }

  return config;
}
