import path from 'node:path';

const SYNTAX_TYPESCRIPT_PLUGIN = '@babel/plugin-syntax-typescript';
const CODEGEN_PLUGIN = '@react-native/babel-plugin-codegen';

type Resolver = (request: string, paths: string[]) => string;

const defaultResolver: Resolver = (request, paths) =>
  require.resolve(request, { paths });

/**
 * Resolves `@babel/plugin-syntax-typescript`, preferring the copy installed in
 * the project (so it matches the project's Babel version) and falling back to
 * the one Re.Pack depends on.
 *
 * `resolveFrom` is injectable so the lookup chain can be exercised hermetically
 * (the real resolver leaks the surrounding install layout, e.g. pnpm's virtual store).
 */
export function resolveSyntaxTypeScriptPlugin(
  projectRoot = process.cwd(),
  resolveFrom: Resolver = defaultResolver
) {
  try {
    return resolveFrom(SYNTAX_TYPESCRIPT_PLUGIN, [projectRoot]);
  } catch {
    return require.resolve(SYNTAX_TYPESCRIPT_PLUGIN);
  }
}

/**
 * Resolves `@react-native/babel-plugin-codegen` through the project's
 * `@react-native/babel-preset`, which declares it as a dependency. With
 * isolated installs (e.g. pnpm) the plugin is usually not resolvable from the
 * project root directly, so that is only used as a fallback.
 */
export function resolveReactNativeCodegenPlugin(
  projectRoot: string,
  resolveFrom: Resolver = defaultResolver
) {
  try {
    const presetPath = resolveFrom('@react-native/babel-preset/package.json', [
      projectRoot,
    ]);
    return resolveFrom(CODEGEN_PLUGIN, [path.dirname(presetPath)]);
  } catch {
    // try the project root next
  }

  try {
    return resolveFrom(CODEGEN_PLUGIN, [projectRoot]);
  } catch (cause) {
    throw Object.assign(
      new Error(
        `Failed to resolve '${CODEGEN_PLUGIN}' from ${projectRoot}. ` +
          `Make sure '@react-native/babel-preset' is installed.`
      ),
      { cause }
    );
  }
}
