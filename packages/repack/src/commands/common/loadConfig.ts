import type { EnvOptions } from '../../types.js';

type Configuration<T> =
  | T
  | ((env: EnvOptions, argv: Record<string, any>) => T | Promise<T>);

export async function loadConfig<C extends Record<string, any>>(
  configFilePath: string,
  env: EnvOptions
): Promise<C> {
  let config: Configuration<C>;

  try {
    config = require(configFilePath);
  } catch {
    config = await import(configFilePath);
  }

  if ('default' in config) {
    config = config.default as Configuration<C>;
  }

  if (typeof config === 'function') {
    return await config(env, {});
  }

  return config;
}
