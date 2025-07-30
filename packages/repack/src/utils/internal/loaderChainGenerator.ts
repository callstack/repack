import type { TransformOptions } from '@babel/core';
import { getJsTransformRules } from '../getJsTransformRules.js';
import type { RulePartitionResult } from './partitionTransforms.js';

export interface LoaderEntry {
  loader: string;
  options?: any;
}

export interface GenerateLoaderChainOptions {
  projectRoot: string;
  swcRules: RulePartitionResult['swcRules'];
  babelRules: RulePartitionResult['babelRules'];
  originalBabelConfig: TransformOptions;
}

function getSwcEnvironmentPreset(transforms: string[]) {
  console.log(transforms);
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
  babelRules,
  originalBabelConfig,
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
        newRule.oneOf = rule.oneOf.map((oneOfRule) => {
          if (oneOfRule.use.loader !== 'builtin:swc-loader') {
            return oneOfRule;
          }
          const options = oneOfRule.use.options;
          oneOfRule.use.options = {
            ...options,
            env: swcEnvPreset,
            jsc: {
              ...options.jsc,
              assumptions: {
                ...options.jsc.assumptions,
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

  const newBabelPlugins = originalBabelConfig.plugins
    ?.filter(
      // @ts-ignore
      (plugin) => !swcRules.includes(plugin.key)
    )
    .filter(
      (p) =>
        ![
          'transform-runtime',
          'transform-react-jsx-self',
          'transform-react-jsx-source',
          'transform-modules-commonjs',
          'transform-nullish-coalescing-operator',
          'transform-logical-assignment-operators',
          'transform-sticky-regex',
          'transform-literals',
          'transform-optional-catch-binding',
          'transform-arrow-functions',
          'transform-numeric-separator',
          'transform-shorthand-properties',
          'transform-react-jsx',
          'transform-class-properties',
          'proposal-export-default-from',
          'transform-computed-properties',
          // @ts-ignore
        ].includes(p.key)
    );

  console.log(newBabelPlugins);
  // Always add Babel loader (either with remaining plugins or full config)
  // Create a new babel config with only the remaining plugins
  const babelConfig: TransformOptions = {
    ...originalBabelConfig,
    plugins: newBabelPlugins,
  };

  loaders.push({
    loader: '@callstack/repack/babel-loader',
    options: { projectRoot, babelConfig },
  });

  return loaders;
}
