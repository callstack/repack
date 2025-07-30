import { type TransformOptions, loadOptions } from '@babel/core';

export interface BabelPlugin {
  name: string;
  options?: any;
}

export interface AnalyzedBabelConfig {
  plugins: BabelPlugin[];
  originalConfig: TransformOptions;
}

/**
 * Analyzes a Babel configuration by loading and flattening it.
 * This resolves all presets into their constituent plugins.
 */
export function analyzeBabelConfig(
  babelConfig: TransformOptions
): AnalyzedBabelConfig {
  // Load and flatten the babel configuration
  const loadedOptions = loadOptions(babelConfig) as TransformOptions | null;

  if (!loadedOptions) {
    return {
      plugins: [],
      originalConfig: babelConfig,
    };
  }

  // Extract plugins from the flattened configuration
  const plugins: BabelPlugin[] = [];

  if (loadedOptions.plugins) {
    for (const plugin of loadedOptions.plugins) {
      if (Array.isArray(plugin)) {
        const [pluginDef, options] = plugin;
        const name =
          typeof pluginDef === 'string'
            ? pluginDef
            : (pluginDef as any)?.key || 'unknown';

        plugins.push({ name, options });
      } else {
        const name =
          typeof plugin === 'string'
            ? plugin
            : (plugin as any)?.key || 'unknown';

        plugins.push({ name });
      }
    }
  }

  return {
    plugins,
    originalConfig: babelConfig,
  };
}

/**
 * Filters plugins that start with 'transform-' prefix
 */
export function filterTransformPlugins(plugins: BabelPlugin[]): BabelPlugin[] {
  return plugins.filter((plugin) => {
    const pluginName = plugin.name.split('/').pop() || '';
    return pluginName.startsWith('transform-');
  });
}
