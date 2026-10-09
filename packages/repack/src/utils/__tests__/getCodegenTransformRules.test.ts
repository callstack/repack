import { getCodegenTransformRules } from '../getCodegenTransformRules.js';

const syntaxTypeScriptPlugin = require.resolve(
  '@babel/plugin-syntax-typescript'
);

describe('getCodegenTransformRules', () => {
  const [rule] = getCodegenTransformRules();
  const { plugins, overrides } = rule.use.options;
  const getOverridePlugins = (file: string) =>
    overrides.find((override) => override.test.test(file))?.plugins;

  it('uses the Re.Pack codegen plugin wrapper', () => {
    expect(plugins).toContain('@callstack/repack/babel-plugin-codegen');
    expect(plugins).not.toContain('@react-native/babel-plugin-codegen');
  });

  it('references the resolved TS syntax plugin', () => {
    expect(plugins).toContainEqual([syntaxTypeScriptPlugin, false]);
    expect(getOverridePlugins('NativeFoo.ts')).toEqual([
      [syntaxTypeScriptPlugin, { isTSX: false, allowNamespaces: true }],
    ]);
    expect(getOverridePlugins('FooNativeComponent.tsx')).toEqual([
      [syntaxTypeScriptPlugin, { isTSX: true, allowNamespaces: true }],
    ]);
  });
});
