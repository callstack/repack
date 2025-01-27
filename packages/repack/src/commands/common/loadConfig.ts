import type { EnvOptions } from '../../types.js';

type ConfigurationObject = {
  name?: string;
} & Record<string, any>;

type Configuration<T> =
  | T
  | ((env: EnvOptions, argv: Record<string, any>) => T | Promise<T>);

async function crossImport<C extends ConfigurationObject>(
  configFilePath: string
): Promise<Configuration<C>> {
  let config: Configuration<C>;

  try {
    config = require(configFilePath);
  } catch {
    config = await import(configFilePath);
  }

  if ('default' in config) {
    config = config.default as Configuration<C>;
  }

  return config;
}

async function normalizeConfig<C extends ConfigurationObject>(
  config: Configuration<C>,
  env: EnvOptions
): Promise<C> {
  // normalize the config into object
  let configObject: C;
  if (typeof config === 'function') {
    configObject = await config(env, {});
  } else {
    configObject = config;
  }

  // normalize the selected properties
  configObject.name = env.platform;

  // return the normalized config object
  return configObject;
}

export async function loadConfig<C extends ConfigurationObject>(
  configFilePath: string,
  env: EnvOptions
): Promise<C> {
  const config = await crossImport<C>(configFilePath);
  const normalizedConfig = await normalizeConfig(config, env);

  return normalizedConfig;
}
