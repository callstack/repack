import type { Configuration, ConfigurationObject } from '../../types.js';

export async function loadProjectConfig<C extends ConfigurationObject>(
  configFilePath: string
): Promise<Configuration<C>> {
  let config: Configuration<C>;

  try {
    // Always use dynamic import to support both TypeScript and JavaScript files
    const imported = await import(configFilePath);
    config = imported.default || imported;
  } catch (error) {
    // Fallback to require only for CommonJS files
    if (configFilePath.endsWith('.js') || configFilePath.endsWith('.cjs') || configFilePath.endsWith('.cts')) {
      config = require(configFilePath);
    } else {
      throw error;
    }
  }

  return config;
}
