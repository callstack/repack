import url from 'node:url';
import type { Configuration, ConfigurationObject } from '../../types.js';

export async function loadProjectConfig<C extends ConfigurationObject>(
  configFilePath: string
): Promise<Configuration<C>> {
  let config: Configuration<C>;

  try {
    const { href: fileUrl } = url.pathToFileURL(configFilePath);
    config = await import(fileUrl);
  } catch {
    config = require(configFilePath);
  }

  if ('default' in config) {
    config = config.default as Configuration<C>;
  }

  return config;
}
