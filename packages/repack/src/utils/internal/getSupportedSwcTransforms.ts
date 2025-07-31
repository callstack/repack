const SWC_SUPPORTED_RULES = new Set([
  'transform-block-scoping',
  'transform-classes',
  'transform-class-static-block',
  'transform-class-properties', // TODO: currently bugged in swc
  'transform-private-property-in-object',
  'transform-private-methods', // TODO: currently bugged in swc
  'transform-destructuring',
  'transform-async-to-generator',
  'transform-async-generator-functions',
  'transform-unicode-regex',
  'transform-named-capturing-groups-regex',
  'transform-optional-chaining',
  'transform-spread',
  'transform-object-rest-spread',
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
]);

function isSupportedTransform(transform: string): boolean {
  return SWC_SUPPORTED_RULES.has(transform);
}

function getSwcRuleName(babelTransformName: string): string {
  // all swc rules are named the same as the babel transforms
  return babelTransformName;
}

export function getSupportedSwcTransforms(transforms: string[]) {
  return transforms.filter(isSupportedTransform).map(getSwcRuleName);
}
