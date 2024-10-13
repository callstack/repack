type Configuration<T, E> =
  | T
  | ((env: E, argv: Record<string, any>) => T | Promise<T>);

export async function loadConfig<Config extends Record<string, any>, Env>(
  configFilePath: string,
  env: Env
): Promise<Config> {
  let config: Configuration<Config, Env>;

  try {
    config = require(configFilePath);
  } catch {
    config = await import(configFilePath);
  }

  if ('default' in config) {
    config = config.default as Configuration<Config, Env>;
  }

  if (typeof config === 'function') {
    return await config(env, {});
  }

  return config;
}
