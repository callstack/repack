import fs from 'node:fs';
import path from 'node:path';

/**
 * Request the assets loader and IncludeModules emit for the asset registry.
 *
 * React Native <= 0.86 ships this file and, on 0.86, resolves it directly (its
 * `exports` map has a `./Libraries/*` wildcard, so it works with package exports
 * on or off). React Native 0.87 removes the file and drops the `./*` wildcard, so
 * the request is remapped to `src/asset-registry.js` with a resolve alias (see
 * {@link getReactNativeAssetRegistryAlias}).
 *
 * Keeping this request unchanged across versions preserves the Module Federation
 * deep-import share key (`shared['react-native/']`) so hosts and remotes built
 * with different Re.Pack versions still share a single registry instance.
 */
export const ASSET_REGISTRY_REQUEST =
  'react-native/Libraries/Image/AssetRegistry';

type Resolver = (request: string, paths: string[]) => string;

const defaultResolver: Resolver = (request, paths) =>
  require.resolve(request, { paths });

/**
 * Resolves React Native's polyfill list, returning the same
 * `() => string[]` contract as the historic `rn-get-polyfills.js`.
 *
 * React Native <= 0.86 shipped `rn-get-polyfills.js` at the package root, which
 * re-exported `@react-native/js-polyfills` (a direct dependency of react-native).
 * 0.87 removed that file and dropped the dependency entirely, so the polyfills
 * are now only reachable through packages that still pull them in - in practice
 * `@react-native/metro-config`, itself an optional peer of the CLI plugin and a
 * template devDependency.
 *
 * The polyfills are inlined into the emitted bundle, so they must be resolvable
 * for production bundles too - they cannot be treated as dev-only. `resolveFrom`
 * is injectable so the lookup chain can be exercised hermetically (the real
 * resolver leaks the surrounding install layout, e.g. pnpm's virtual store).
 */
export function resolveReactNativePolyfills(
  projectRoot: string,
  reactNativePath: string,
  resolveFrom: Resolver = defaultResolver
): () => string[] {
  const rnGetPolyfillsPath = path.join(reactNativePath, 'rn-get-polyfills.js');
  if (fs.existsSync(rnGetPolyfillsPath)) {
    return require(rnGetPolyfillsPath) as () => string[];
  }

  // React Native >= 0.87: resolve the polyfills from the project, then chain
  // through `@react-native/metro-config`, which owns the dependency. Each
  // location is tried in turn (same "resolve the owner, then chain" pattern used
  // for the hermes parser).
  const lookupDirs: string[] = [projectRoot];
  try {
    const metroConfigPackageJson = resolveFrom(
      '@react-native/metro-config/package.json',
      [projectRoot]
    );
    lookupDirs.push(path.dirname(metroConfigPackageJson));
  } catch {
    // metro-config is an optional peer; a missing entry is handled below.
  }

  let jsPolyfillsPath: string | undefined;
  for (const dir of lookupDirs) {
    try {
      jsPolyfillsPath = resolveFrom('@react-native/js-polyfills', [dir]);
      break;
    } catch {
      // try the next location
    }
  }

  if (!jsPolyfillsPath) {
    throw new Error(
      '[RepackNativeEntryPlugin] Unable to locate React Native polyfills. ' +
        "React Native >= 0.87 no longer depends on '@react-native/js-polyfills', " +
        'so Repack cannot resolve the polyfills that must be present in the ' +
        'bundle. Add a version-matched `@react-native/js-polyfills` (or ' +
        '`@react-native/metro-config`) to your project so it is available while bundling.'
    );
  }

  return require(jsPolyfillsPath) as () => string[];
}

/**
 * Builds the `resolve.alias` entry that maps {@link ASSET_REGISTRY_REQUEST} to
 * the relocated registry file on the React Native >= 0.87 layout.
 *
 * Returns `null` (no alias) whenever the legacy file already exists, or no
 * registry can be found at all. On <= 0.86 the legacy request resolves natively,
 * so injecting an alias there would mutate resolution for no benefit - and would
 * break the 0.86 `exports` wildcard path. The alias target is extensionless so
 * platform extensions (`.native.js`, `.ios.js`, ...) still apply.
 */
export function getReactNativeAssetRegistryAlias(
  reactNativePath: string
): Record<string, string> | null {
  const legacyFile = path.join(
    reactNativePath,
    'Libraries',
    'Image',
    'AssetRegistry.js'
  );
  const modernFile = path.join(reactNativePath, 'src', 'asset-registry.js');

  // Only remap on the new layout: legacy file gone, relocated file present.
  if (fs.existsSync(legacyFile) || !fs.existsSync(modernFile)) {
    return null;
  }

  // Exact-match alias (`$`) so only the exact request is remapped, and the
  // request keeps its `react-native/` prefix for Module Federation sharing.
  return {
    [`${ASSET_REGISTRY_REQUEST}$`]: path.join(
      reactNativePath,
      'src',
      'asset-registry'
    ),
  };
}

/**
 * Builds the `resolve.alias` entries that keep React Native's internal deep
 * imports working when package exports are enabled (`enablePackageExports`).
 *
 * React Native <= 0.86 exposed its `exports` map with a `./*` / `./src/*`
 * wildcard, so deep requests such as
 * `react-native/src/private/featureflags/ReactNativeFeatureFlags` (imported by
 * `@react-native/virtualized-lists` and other first-party packages) resolved
 * through the exports map. React Native 0.87 narrowed the map to a small set of
 * explicit subpaths and dropped those wildcards, so the same deep requests no
 * longer match any export condition and resolution fails once package exports
 * are on. React Native still ships `src/private/**` on disk - it is simply not
 * exported - and no resolve condition can un-hide it, so the only way to keep
 * bundling with package exports enabled is to remap the prefix to the on-disk
 * directory. Aliasing to an absolute path bypasses the exports map entirely.
 *
 * Returns `null` (no alias) when `src/private` is already reachable through the
 * exports map (<= 0.86), when React Native declares no exports map at all, or
 * when the directory is absent - so this is a no-op on the legacy layout.
 */
export function getReactNativeDeepImportAliases(
  reactNativePath: string
): Record<string, string> | null {
  const privateDir = path.join(reactNativePath, 'src', 'private');
  if (!fs.existsSync(privateDir)) {
    return null;
  }

  let exportsMap: Record<string, unknown> | undefined;
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(reactNativePath, 'package.json'), 'utf8')
    ) as { exports?: unknown };
    exportsMap =
      pkg.exports && typeof pkg.exports === 'object'
        ? (pkg.exports as Record<string, unknown>)
        : undefined;
  } catch {
    return null;
  }

  // No exports map: resolution is file-path based, nothing to work around.
  if (!exportsMap) {
    return null;
  }

  // Already reachable through the exports map (React Native <= 0.86 wildcards).
  if (
    exportsMap['./*'] ||
    exportsMap['./src/*'] ||
    exportsMap['./src/private/*']
  ) {
    return null;
  }

  return {
    'react-native/src/private': privateDir,
  };
}
