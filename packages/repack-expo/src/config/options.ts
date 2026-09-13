import { ConfigPluginError } from './ConfigPluginError.js';

export type RepackExpoPluginOptions = {
  /** Rspack configuration path passed to native release bundle commands. */
  configPath?: string;
  /** Application entry passed to native release bundle commands. */
  entry?: string;
};

export function normalizeConfigPluginOptions(
  options: RepackExpoPluginOptions | void
): RepackExpoPluginOptions {
  if (options === undefined) return {};
  if (
    options === null ||
    typeof options !== 'object' ||
    Array.isArray(options)
  ) {
    throw new ConfigPluginError({
      code: 'INVALID_OPTIONS',
      message: 'The Re.Pack Expo Config Plugin options must be an object.',
      recovery:
        'Pass an options object such as { configPath: "rspack.config.mjs" } or remove the options value.',
    });
  }

  for (const name of ['configPath', 'entry'] as const) {
    const value = options[name];
    if (
      value !== undefined &&
      (typeof value !== 'string' ||
        value.length === 0 ||
        /[\r\n\0]/.test(value))
    ) {
      throw new ConfigPluginError({
        code: 'INVALID_OPTIONS',
        message: `The Re.Pack Expo Config Plugin ${name} option must be a non-empty single-line string.`,
        recovery: `Set ${name} to a valid project-relative or absolute value, or remove the option.`,
      });
    }
  }

  return { configPath: options.configPath, entry: options.entry };
}
