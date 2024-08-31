import type { Configuration } from '@rspack/core';
import { EnvOptions } from '../../types';

type RspackConfig =
  | Configuration
  | ((
      env: EnvOptions,
      argv: Record<string, any>
    ) => Configuration | Promise<Configuration>);

export async function loadConfig(
  configFilePath: string,
  env: EnvOptions
): Promise<Configuration> {
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
