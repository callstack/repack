import type { BabelPlugin } from './babelConfigAnalyzer.js';

export interface SwcTransformMapping {
  swcEquivalent: string;
  optionsMapper?: (babelOptions: any) => any;
}

// Mapping of Babel transform plugins to SWC equivalents
// Note: SWC uses the same names as Babel plugins in the env.include array
const BABEL_TO_SWC_MAPPINGS: Record<string, SwcTransformMapping> = {
  'transform-block-scoping': {
    swcEquivalent: 'transform-block-scoping',
  },
  'transform-class-properties': {
    swcEquivalent: 'transform-class-properties',
    optionsMapper: (options) => ({
      loose: options?.loose ?? true, // React Native default
    }),
  },
  'transform-private-methods': {
    swcEquivalent: 'transform-private-methods',
    optionsMapper: (options) => ({
      loose: options?.loose ?? true,
    }),
  },
  'transform-private-property-in-object': {
    swcEquivalent: 'transform-private-property-in-object',
    optionsMapper: (options) => ({
      loose: options?.loose ?? true,
    }),
  },
  'transform-classes': {
    swcEquivalent: 'transform-classes',
    optionsMapper: (options) => ({
      loose: options?.loose ?? false,
    }),
  },
  'transform-destructuring': {
    swcEquivalent: 'transform-destructuring',
    optionsMapper: (options) => ({
      loose: options?.loose ?? false,
    }),
  },
  'transform-async-to-generator': {
    swcEquivalent: 'transform-async-to-generator',
  },
  'transform-async-generator-functions': {
    swcEquivalent: 'transform-async-generator-functions',
  },
  'transform-unicode-regex': {
    swcEquivalent: 'transform-unicode-regex',
  },
  'transform-named-capturing-groups-regex': {
    swcEquivalent: 'transform-named-capturing-groups-regex',
  },
  'transform-optional-chaining': {
    swcEquivalent: 'transform-optional-chaining',
    optionsMapper: (options) => ({
      loose: options?.loose ?? false,
    }),
  },
  'transform-spread': {
    swcEquivalent: 'transform-spread',
    optionsMapper: (options) => ({
      loose: options?.loose ?? false,
    }),
  },
  'transform-object-rest-spread': {
    swcEquivalent: 'transform-object-rest-spread',
    optionsMapper: (options) => ({
      loose: options?.loose ?? false,
      useBuiltIns: options?.useBuiltIns ?? false,
    }),
  },
  'transform-class-static-block': {
    swcEquivalent: 'transform-class-static-block',
  },
  'transform-parameters': {
    swcEquivalent: 'transform-parameters',
    optionsMapper: (options) => ({
      loose: options?.loose ?? false,
    }),
  },
  'transform-function-name': {
    swcEquivalent: 'transform-function-name',
  },
};

export interface PluginSeparationResult {
  swcCompatible: Array<{
    plugin: BabelPlugin;
    swcConfig: any;
  }>;
  babelOnly: BabelPlugin[];
}

/**
 * Separates Babel plugins into SWC-compatible and Babel-only groups
 */
export function separateBabelPlugins(
  plugins: BabelPlugin[]
): PluginSeparationResult {
  const swcCompatible: PluginSeparationResult['swcCompatible'] = [];
  const babelOnly: BabelPlugin[] = [];

  for (const plugin of plugins) {
    const pluginName = plugin.name.split('/').pop() || '';
    const mapping = BABEL_TO_SWC_MAPPINGS[pluginName];

    if (mapping) {
      const swcConfig = mapping.optionsMapper
        ? mapping.optionsMapper(plugin.options)
        : {};

      swcCompatible.push({
        plugin,
        swcConfig: {
          name: mapping.swcEquivalent,
          options: swcConfig,
        },
      });
    } else {
      babelOnly.push(plugin);
    }
  }

  return { swcCompatible, babelOnly };
}
