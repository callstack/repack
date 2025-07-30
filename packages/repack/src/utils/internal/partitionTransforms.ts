export interface RulePartitionResult {
  swcRules: string[];
  babelRules: string[];
}

const SWC_SUPPORTED_RULES = [
  'transform-block-scoping',
  // 'transform-class-properties',
  'transform-private-methods',
  'transform-private-property-in-object',
  'transform-classes',
  'transform-destructuring',
  'transform-async-to-generator',
  'transform-async-generator-functions',
  'transform-unicode-regex',
  'transform-named-capturing-groups-regex',
  'transform-optional-chaining',
  'transform-spread',
  'transform-object-rest-spread',
  'transform-class-static-block',
  'transform-parameters',
  'transform-function-name',
  'transform-nullish-coalescing-operator',
  'transform-logical-assignment-operators',
  'transform-sticky-regex',
  'transform-literals',
  'transform-optional-catch-binding',
  'transform-arrow-functions',
  'transform-numeric-separator',
  'transform-shorthand-properties',
  'transform-computed-properties',
];

function getSwcRuleName(babelTransformName: string): string | null {
  // all swc rules are named the same as the babel transforms
  // we just check if the transform is supported by swc
  if (SWC_SUPPORTED_RULES.includes(babelTransformName)) {
    return babelTransformName;
  }
  return null;
}

export function partitionTransforms(transforms: string[]): RulePartitionResult {
  return transforms.reduce(
    (result, transformName) => {
      const swcRuleName = getSwcRuleName(transformName);
      if (swcRuleName !== null) {
        result.swcRules.push(swcRuleName);
      } else {
        result.babelRules.push(transformName);
      }
      return result;
    },
    { swcRules: [] as string[], babelRules: [] as string[] }
  );
}
