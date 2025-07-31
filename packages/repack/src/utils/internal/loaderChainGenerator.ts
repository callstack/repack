import type { TransformOptions } from '@babel/core';
import { getJsTransformRules } from '../getJsTransformRules.js';

export interface LoaderEntry {
  loader: string;
  parallel?: boolean;
  options?: any;
}

export interface GenerateLoaderChainOptions {
  projectRoot: string;
  swcRules: string[];
  originalBabelConfig: TransformOptions;
}

function getSwcEnvironmentPreset(transforms: string[]) {
  return {
    // disable all transforms (node supports everything)
    targets: { node: 24 },
    // add transforms manually that match the RN preset
    include: transforms,
  };
}

export function generateLoaderChain({
  projectRoot,
  swcRules,
}: GenerateLoaderChainOptions): LoaderEntry[] {
  const loaders: LoaderEntry[] = [];

  const swcEnvPreset = getSwcEnvironmentPreset(swcRules);
  // Only add SWC loader if there are compatible plugins
  if (swcRules.length > 0) {
    const swcLoaderRules = getJsTransformRules({
      codegen: { enabled: false },
      flow: { enabled: false },
    }).map((rule) => {
      const newRule = { ...rule };
      if ('oneOf' in rule && 'oneOf' in newRule) {
        // @ts-ignore
        newRule.test = undefined;
        newRule.oneOf = rule.oneOf.map((oneOfRule) => {
          if (oneOfRule.use.loader !== 'builtin:swc-loader') {
            return oneOfRule;
          }
          const options = oneOfRule.use.options;
          oneOfRule.use.options = {
            ...options,
            // @ts-ignore
            env: { ...swcEnvPreset, forceAllTransforms: false },
            jsc: {
              ...options.jsc,
              assumptions: {
                // nullish-coalescing-operator && optional-chaining loose mode
                noDocumentAll: true,
                // transform-class-properties loose mode
                setPublicClassFields: true,
                // object-rest-spread loose mode
                setSpreadProperties: true,
                // transform-private-methods loose mode
                privateFieldsAsProperties: true,
              },
            },
          };
          return oneOfRule;
        });
      }
      return newRule;
    });
    // @ts-ignore this is just one swc rule with oneOf field
    loaders.push(...swcLoaderRules);
  }

  const excludePlugins = [
    ...swcRules,
    // handled by swc jsc.externalHelpers
    'transform-runtime',
    // handled by swc jsc.transform.react.development
    'transform-react-jsx-self',
    'transform-react-jsx-source',
    // handled by swc module.type
    'transform-modules-commonjs',
    // handled by swc jsc.transform.react.runtime
    'transform-react-jsx',
    // handled by swc jsc.parser.exportDefaultFrom
    'proposal-export-default-from',
    // handled by swc
    'transform-typescript',
  ];

  loaders.push({
    // @ts-ignore
    type: 'javascript/auto',
    use: {
      loader: '@callstack/repack/babel-loader',
      parallel: true,
      options: { excludePlugins, projectRoot },
    },
  });

  return loaders;
}
