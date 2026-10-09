import {
  resolveReactNativeCodegenPlugin,
  resolveSyntaxTypeScriptPlugin,
} from '../resolveBabelPlugins.js';

const projectRoot = '/project';
const presetRoot = '/store/@react-native/babel-preset';

/** Fake resolver: maps `request@dir` to a path, throws for anything else. */
function createResolver(entries: Record<string, string>) {
  return (request: string, paths: string[]) => {
    const resolved = entries[`${request}@${paths[0]}`];
    if (!resolved) throw new Error(`Cannot find module '${request}'`);
    return resolved;
  };
}

describe('resolveSyntaxTypeScriptPlugin', () => {
  it("prefers the project's own copy", () => {
    const resolveFrom = createResolver({
      [`@babel/plugin-syntax-typescript@${projectRoot}`]: '/project/plugin.js',
    });
    expect(resolveSyntaxTypeScriptPlugin(projectRoot, resolveFrom)).toBe(
      '/project/plugin.js'
    );
  });

  it("falls back to Re.Pack's copy when the project has none", () => {
    expect(resolveSyntaxTypeScriptPlugin(projectRoot, createResolver({}))).toBe(
      require.resolve('@babel/plugin-syntax-typescript')
    );
  });
});

describe('resolveReactNativeCodegenPlugin', () => {
  it('resolves the plugin through @react-native/babel-preset', () => {
    // Isolated install: the plugin is only reachable from the preset.
    const resolveFrom = createResolver({
      [`@react-native/babel-preset/package.json@${projectRoot}`]: `${presetRoot}/package.json`,
      [`@react-native/babel-plugin-codegen@${presetRoot}`]: '/store/codegen.js',
    });
    expect(resolveReactNativeCodegenPlugin(projectRoot, resolveFrom)).toBe(
      '/store/codegen.js'
    );
  });

  it('prefers the preset-owned plugin over one in the project root', () => {
    const resolveFrom = createResolver({
      [`@react-native/babel-preset/package.json@${projectRoot}`]: `${presetRoot}/package.json`,
      [`@react-native/babel-plugin-codegen@${presetRoot}`]: '/store/codegen.js',
      [`@react-native/babel-plugin-codegen@${projectRoot}`]:
        '/project/codegen.js',
    });
    expect(resolveReactNativeCodegenPlugin(projectRoot, resolveFrom)).toBe(
      '/store/codegen.js'
    );
  });

  it('falls back to the project root without the preset', () => {
    const resolveFrom = createResolver({
      [`@react-native/babel-plugin-codegen@${projectRoot}`]:
        '/project/codegen.js',
    });
    expect(resolveReactNativeCodegenPlugin(projectRoot, resolveFrom)).toBe(
      '/project/codegen.js'
    );
  });

  it('throws a helpful error when the plugin cannot be found', () => {
    expect(() =>
      resolveReactNativeCodegenPlugin(projectRoot, createResolver({}))
    ).toThrow(
      "Failed to resolve '@react-native/babel-plugin-codegen' from /project"
    );
  });
});
