import type {
  SwcLoaderEsParserConfig,
  SwcLoaderOptions,
  SwcLoaderParserConfig,
  SwcLoaderTsParserConfig,
} from '@rspack/core';

const SWC_SUPPORTED_NORMAL_RULES = new Set([
  'transform-block-scoping',
  'transform-classes',
  'transform-class-static-block',
  'transform-destructuring',
  'transform-async-to-generator',
  'transform-async-generator-functions',
  'transform-unicode-regex',
  'transform-named-capturing-groups-regex',
  'transform-spread',
  'transform-parameters',
  'transform-function-name',
  'transform-logical-assignment-operators',
  'transform-sticky-regex',
  'transform-literals',
  'transform-optional-catch-binding',
  'transform-arrow-functions',
  'transform-numeric-separator',
  'transform-shorthand-properties',
  'transform-computed-properties',
]);

const SWC_SUPPORTED_CONFIGURABLE_RULES = new Set([
  'transform-class-properties',
  'transform-private-methods',
  'transform-private-property-in-object',
  'transform-object-rest-spread',
  'transform-optional-chaining',
  'transform-nullish-coalescing-operator',
  'transform-for-of',
]);

const SWC_SUPPORTED_CUSTOM_RULES = new Set([
  'transform-runtime',
  'transform-react-jsx-self',
  'transform-react-jsx-source',
  'transform-react-jsx',
  'transform-modules-commonjs',
  'proposal-export-default-from',
  'transform-typescript',
]);

function getTransformRuntimeConfig(
  swcConfig: SwcLoaderOptions
): SwcLoaderOptions {
  return {
    ...swcConfig,
    jsc: {
      ...swcConfig.jsc,
      externalHelpers: true,
    },
  };
}

function getTransformReactDevelopmentConfig(
  swcConfig: SwcLoaderOptions
): SwcLoaderOptions {
  return {
    ...swcConfig,
    jsc: {
      ...swcConfig.jsc,
      transform: {
        ...swcConfig.jsc?.transform,
        react: {
          ...swcConfig.jsc?.transform?.react,
          development: true,
        },
      },
    },
  };
}

function getTransformReactRuntimeConfig(
  swcConfig: SwcLoaderOptions,
  reactRuntimeConfig: Record<string, any> = {
    runtime: 'automatic',
  }
): SwcLoaderOptions {
  return {
    ...swcConfig,
    jsc: {
      ...swcConfig.jsc,
      transform: {
        ...swcConfig.jsc?.transform,
        react: {
          ...swcConfig.jsc?.transform?.react,
          runtime: reactRuntimeConfig.runtime,
          importSource: reactRuntimeConfig.importSource,
        },
      },
    },
  };
}

function getTransformModulesCommonjsConfig(
  swcConfig: SwcLoaderOptions,
  moduleConfig: Record<string, any> = {
    strict: true,
    strictMode: true,
    allowTopLevelThis: true,
  }
): SwcLoaderOptions {
  return {
    ...swcConfig,
    module: {
      ...swcConfig.module,
      type: 'commonjs',
      strict: Boolean(moduleConfig.strict),
      strictMode: Boolean(moduleConfig.strictMode),
      allowTopLevelThis: Boolean(moduleConfig.allowTopLevelThis),
    },
  };
}

function getTransformExportDefaultFromConfig(
  swcConfig: SwcLoaderOptions
): SwcLoaderOptions {
  const parserConfig = ensureValidESParserConfig(swcConfig.jsc?.parser);
  return {
    ...swcConfig,
    jsc: {
      ...swcConfig.jsc,
      parser: {
        ...parserConfig,
        exportDefaultFrom: true,
      },
    },
  };
}

function getTransformTypescriptConfig(
  swcConfig: SwcLoaderOptions,
  ruleConfig: Record<string, any> = { isTSX: false }
): SwcLoaderOptions {
  const parserConfig = ensureValidTSParserConfig(swcConfig.jsc?.parser);
  return {
    ...swcConfig,
    jsc: {
      ...swcConfig.jsc,
      parser: {
        ...parserConfig,
        syntax: 'typescript',
        tsx: ruleConfig.isTSX,
      },
    },
  };
}

function getTransformClassPropertiesConfig(
  swcConfig: SwcLoaderOptions,
  ruleConfig: Record<string, any> = { loose: false }
): SwcLoaderOptions {
  return {
    ...swcConfig,
    jsc: {
      ...swcConfig.jsc,
      assumptions: {
        ...swcConfig.jsc?.assumptions,
        setPublicClassFields:
          swcConfig.jsc?.assumptions?.setPublicClassFields || ruleConfig.loose,
      },
    },
  };
}

function getTransformPrivateMethodsPropertyConfig(
  swcConfig: SwcLoaderOptions,
  ruleConfig: Record<string, any> = { loose: false }
): SwcLoaderOptions {
  return {
    ...swcConfig,
    jsc: {
      ...swcConfig.jsc,
      assumptions: {
        ...swcConfig.jsc?.assumptions,
        privateFieldsAsProperties:
          swcConfig.jsc?.assumptions?.privateFieldsAsProperties ||
          ruleConfig.loose,
        setPublicClassFields:
          swcConfig.jsc?.assumptions?.setPublicClassFields || ruleConfig.loose,
      },
    },
  };
}

function getTransformObjectRestSpreadConfig(
  swcConfig: SwcLoaderOptions,
  ruleConfig: Record<string, any> = { loose: false }
): SwcLoaderOptions {
  return {
    ...swcConfig,
    jsc: {
      ...swcConfig.jsc,
      assumptions: {
        ...swcConfig.jsc?.assumptions,
        setSpreadProperties:
          swcConfig.jsc?.assumptions?.setSpreadProperties || ruleConfig.loose,
      },
    },
  };
}

function getTransformOptionalChainingNullishCoalescingConfig(
  swcConfig: SwcLoaderOptions,
  ruleConfig: Record<string, any> = { loose: false }
): SwcLoaderOptions {
  return {
    ...swcConfig,
    jsc: {
      ...swcConfig.jsc,
      assumptions: {
        ...swcConfig.jsc?.assumptions,
        noDocumentAll:
          swcConfig.jsc?.assumptions?.noDocumentAll || ruleConfig.loose,
      },
    },
  };
}

function getTransformForOfConfig(
  swcConfig: SwcLoaderOptions,
  ruleConfig: Record<string, any> = { loose: false }
): SwcLoaderOptions {
  return {
    ...swcConfig,
    jsc: {
      ...swcConfig.jsc,
      assumptions: {
        ...swcConfig.jsc?.assumptions,
        skipForOfIteratorClosing:
          swcConfig.jsc?.assumptions?.skipForOfIteratorClosing ||
          ruleConfig.loose,
      },
    },
  };
}

const SWC_SUPPORTED_CONFIGURABLE_RULES_MAP = {
  'transform-class-properties': getTransformClassPropertiesConfig,
  'transform-private-methods': getTransformPrivateMethodsPropertyConfig,
  'transform-private-property-in-object':
    getTransformPrivateMethodsPropertyConfig,
  'transform-object-rest-spread': getTransformObjectRestSpreadConfig,
  'transform-optional-chaining':
    getTransformOptionalChainingNullishCoalescingConfig,
  'transform-nullish-coalescing-operator':
    getTransformOptionalChainingNullishCoalescingConfig,
  'transform-for-of': getTransformForOfConfig,
};

const SWC_SUPPORTED_CUSTOM_RULES_MAP = {
  'transform-runtime': getTransformRuntimeConfig,
  'transform-react-jsx': getTransformReactRuntimeConfig,
  'transform-react-jsx-self': getTransformReactDevelopmentConfig,
  'transform-react-jsx-source': getTransformReactDevelopmentConfig,
  'transform-modules-commonjs': getTransformModulesCommonjsConfig,
  'proposal-export-default-from': getTransformExportDefaultFromConfig,
  'transform-typescript': getTransformTypescriptConfig,
};

function ensureValidTSParserConfig(
  parserConfig?: SwcLoaderParserConfig
): SwcLoaderTsParserConfig {
  if (parserConfig?.syntax !== 'typescript') {
    return { syntax: 'typescript' };
  }
  return parserConfig;
}

function ensureValidESParserConfig(
  parserConfig?: SwcLoaderParserConfig
): SwcLoaderEsParserConfig {
  if (parserConfig?.syntax !== 'ecmascript') {
    return { syntax: 'ecmascript' };
  }
  return parserConfig;
}

export function getSupportedSwcNormalTransforms(
  transforms: [string, Record<string, any> | undefined][]
) {
  return transforms
    .filter(([transform]) => SWC_SUPPORTED_NORMAL_RULES.has(transform))
    .map(([transform]) => transform);
}

export function getSupportedSwcConfigurableTransforms(
  transforms: [string, Record<string, any> | undefined][],
  swcConfig: SwcLoaderOptions
) {
  const transformNames = transforms.map(([transform]) => transform);
  const finalSwcConfig = transforms
    .filter(([transform]) => SWC_SUPPORTED_CONFIGURABLE_RULES.has(transform))
    .reduce((config, [transform, transformConfig]) => {
      const handler =
        SWC_SUPPORTED_CONFIGURABLE_RULES_MAP[
          transform as keyof typeof SWC_SUPPORTED_CONFIGURABLE_RULES_MAP
        ];
      return handler(config, transformConfig);
    }, swcConfig);
  return { swcConfig: finalSwcConfig, transformNames };
}

export function getSupportedSwcCustomTransforms(
  transforms: [string, Record<string, any> | undefined][],
  swcConfig: SwcLoaderOptions
) {
  const transformNames = transforms.map(([transform]) => transform);
  const finalSwcConfig = transforms
    .filter(([transform]) => SWC_SUPPORTED_CUSTOM_RULES.has(transform))
    .reduce((config, [transform, transformConfig]) => {
      const handler =
        SWC_SUPPORTED_CUSTOM_RULES_MAP[
          transform as keyof typeof SWC_SUPPORTED_CUSTOM_RULES_MAP
        ];
      return handler(config, transformConfig);
    }, swcConfig);
  return { swcConfig: finalSwcConfig, transformNames };
}
