import fs from 'node:fs';
import path from 'node:path';

/**
 * Canonical request used to reach React Native's asset registry.
 *
 * React Native <= 0.86 exposed the registry at
 * `react-native/Libraries/Image/AssetRegistry`; 0.87 moved it to
 * `src/asset-registry.js`, reachable only through the package `exports` map.
 * There is no single request string that resolves across both layouts under
 * both of Repack's resolver modes (the default resolver ignores `exports`,
 * while `enablePackageExports` honours it and 0.87 dropped the `./*` wildcard).
 *
 * We therefore always emit this canonical request and map it to the real file
 * with a resolve alias (see {@link getReactNativeAssetRegistryAlias}). Keeping
 * the `react-native/` prefix is required so Module Federation's deep-import
 * sharing (`shared['react-native/']`) continues to treat it as a singleton.
 */
export const ASSET_REGISTRY_REQUEST = 'react-native/asset-registry';

/**
 * Resolves React Native's polyfill list, returning the same
 * `() => string[]` contract as the historic `rn-get-polyfills.js`.
 *
 * React Native <= 0.86 shipped `rn-get-polyfills.js` at the package root, which
 * re-exported `@react-native/js-polyfills` (a direct dependency of react-native).
 * 0.87 removed that file and dropped the dependency entirely, so the polyfills
 * are now only reachable through packages that still pull them in (e.g.
 * `@react-native/metro-config`, itself an optional peer of the CLI plugin).
 *
 * The polyfills are inlined into the emitted bundle, so they must be resolvable
 * for production bundles too - they cannot be treated as dev-only. We resolve
 * from every plausible location and fail with an actionable message rather than
 * a cryptic `MODULE_NOT_FOUND` from Repack's own directory.
 */
export function resolveReactNativePolyfills(
  projectRoot: string,
  reactNativePath: string
): () => string[] {
  const rnGetPolyfillsPath = path.join(reactNativePath, 'rn-get-polyfills.js');
  if (fs.existsSync(rnGetPolyfillsPath)) {
    return require(rnGetPolyfillsPath) as () => string[];
  }

  // React Native >= 0.87: locate `@react-native/js-polyfills` from locations
  // that own it, following the same "resolve the owner, then chain" pattern
  // used for the hermes parser.
  const lookupPaths = [reactNativePath, projectRoot];
  try {
    lookupPaths.push(
      require.resolve('@react-native/metro-config', { paths: [projectRoot] })
    );
  } catch {
    // metro-config is an optional peer; a missing entry is handled below.
  }

  try {
    const jsPolyfillsPath = require.resolve('@react-native/js-polyfills', {
      paths: lookupPaths,
    });
    return require(jsPolyfillsPath) as () => string[];
  } catch {
    throw new Error(
      '[RepackNativeEntryPlugin] Unable to locate React Native polyfills. ' +
        "React Native >= 0.87 no longer depends on '@react-native/js-polyfills', " +
        'so Repack cannot resolve the polyfills that must be present in the ' +
        'bundle. Add a version-matched `@react-native/js-polyfills` (or ' +
        '`@react-native/metro-config`) to your project so it is available while bundling.'
    );
  }
}

/**
 * Builds the `resolve.alias` entry that maps the canonical
 * {@link ASSET_REGISTRY_REQUEST} to the real registry file for the installed
 * React Native layout.
 *
 * The alias target is extensionless so platform extensions (`.native.js`,
 * `.ios.js`, ...) still apply. Returns `null` when no registry file is found
 * (for example in test fixtures), in which case no alias is injected and the
 * canonical request is left to fail resolution like any missing module.
 */
export function getReactNativeAssetRegistryAlias(
  reactNativePath: string
): Record<string, string> | null {
  const modern = path.join(reactNativePath, 'src', 'asset-registry');
  const legacy = path.join(
    reactNativePath,
    'Libraries',
    'Image',
    'AssetRegistry'
  );

  let target: string | undefined;
  if (fs.existsSync(`${modern}.js`)) {
    target = modern;
  } else if (fs.existsSync(`${legacy}.js`)) {
    target = legacy;
  }

  if (!target) {
    return null;
  }

  // Exact-match alias (`$`) so only the canonical request is remapped, while
  // the request keeps its `react-native/` prefix for Module Federation sharing.
  return { [`${ASSET_REGISTRY_REQUEST}$`]: target };
}
