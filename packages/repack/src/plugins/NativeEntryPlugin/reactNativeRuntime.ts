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
 * Where `@react-native/js-polyfills` is looked up on React Native >= 0.87, in
 * order: the project itself, then the packages that depend on it. Each chain is
 * resolved from the project root, one package from the directory of the
 * previous one, so the polyfills are found even when the owner is not hoisted
 * (e.g. pnpm). Expo projects don't install `@react-native/metro-config` and
 * reach the polyfills through Expo's own Metro config instead.
 */
const POLYFILLS_LOOKUP_CHAINS = [
  // The project root itself.
  [],
  ['@react-native/metro-config'],
  ['expo', '@expo/metro-config'],
];

function resolvePackageChainDir(
  chain: string[],
  projectRoot: string,
  resolveFrom: Resolver
): string | undefined {
  let dir = projectRoot;
  try {
    for (const name of chain) {
      dir = path.dirname(resolveFrom(`${name}/package.json`, [dir]));
    }
    return dir;
  } catch {
    // Owners are optional; a missing link is handled by the caller.
    return undefined;
  }
}

/**
 * Resolves React Native's polyfill list, returning the same
 * `() => string[]` contract as the historic `rn-get-polyfills.js`.
 *
 * React Native <= 0.86 shipped `rn-get-polyfills.js` at the package root, which
 * re-exported `@react-native/js-polyfills` (a direct dependency of react-native).
 * 0.87 removed that file and dropped the dependency entirely, so the polyfills
 * are now only reachable through packages that still depend on them - see
 * {@link POLYFILLS_LOOKUP_CHAINS}.
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
    const getPolyfills: () => string[] = require(rnGetPolyfillsPath);
    return getPolyfills;
  }

  // React Native >= 0.87: resolve the polyfills from the project, then chain
  // through the packages that own the dependency. Each location is tried in
  // turn (same "resolve the owner, then chain" pattern used for the hermes
  // parser).
  let jsPolyfillsPath: string | undefined;
  for (const chain of POLYFILLS_LOOKUP_CHAINS) {
    const dir = resolvePackageChainDir(chain, projectRoot, resolveFrom);
    if (!dir) continue;
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
        '`@react-native/metro-config`) to your project so it is available while bundling. ' +
        'In Expo projects this means `expo` could not be resolved from the project root.'
    );
  }

  const getPolyfills: () => string[] = require(jsPolyfillsPath);
  return getPolyfills;
}

/**
 * Reads React Native's `package.json` `exports` map, or `null` when it declares
 * none or the manifest can't be read.
 */
function readReactNativeExportsMap(
  reactNativePath: string
): Record<string, unknown> | null {
  try {
    const pkg: { exports?: unknown } = JSON.parse(
      fs.readFileSync(path.join(reactNativePath, 'package.json'), 'utf8')
    );
    return pkg.exports && typeof pkg.exports === 'object'
      ? (pkg.exports as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * Request libraries such as `react-native-svg` <= 15.15 use for the asset
 * registry. React Native >= 0.87 no longer depends on
 * `@react-native/assets-registry`, so it may be missing or resolve to a copy
 * hoisted for another React Native version - a separate registry instance.
 */
const ASSETS_REGISTRY_PACKAGE_REQUEST =
  '@react-native/assets-registry/registry';

/**
 * Builds the `resolve.alias` entries that map {@link ASSET_REGISTRY_REQUEST} and
 * {@link ASSETS_REGISTRY_PACKAGE_REQUEST} to the relocated registry file on the
 * React Native >= 0.87 layout, so every request shares one registry (as Expo's
 * Metro config does).
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

  // Exact-match aliases (`$`) so only the exact requests are remapped, and the
  // requests keep their prefixes for Module Federation sharing.
  const registry = path.join(reactNativePath, 'src', 'asset-registry');
  return {
    [`${ASSET_REGISTRY_REQUEST}$`]: registry,
    [`${ASSETS_REGISTRY_PACKAGE_REQUEST}$`]: registry,
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

  const exportsMap = readReactNativeExportsMap(reactNativePath);
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

function getDefaultExportTarget(target: unknown): string | undefined {
  if (typeof target === 'string') return target;
  if (target && typeof target === 'object' && !Array.isArray(target)) {
    const value = (target as Record<string, unknown>).default;
    if (typeof value === 'string') return value;
  }
  return undefined;
}

/**
 * Builds exact-match `resolve.alias` entries for the explicit subpath exports
 * React Native >= 0.87 declares, such as `react-native/setup-env` and
 * `react-native/react-private-interface`, whose files live under `src/` rather
 * than at the requested path.
 *
 * These requests only resolve through the `exports` map, which is skipped when
 * package exports are disabled (Repack's default) and when `react-native` is
 * aliased to its directory - the alias rewrites the request to a path that
 * doesn't exist. React Native 0.88's own packages (e.g.
 * `@react-native/virtualized-lists`) and Expo SDK 58 import these entry points,
 * so each one is aliased to the file its `default` export condition points to.
 * Only that condition is read: React Native's other conditions on these
 * subpaths are type-only. The targets keep their `.js` extension, as package
 * exports resolve to exact files.
 *
 * Returns `null` (no alias) when React Native declares no such subpaths
 * (<= 0.86) or no exports map at all.
 */
export function getReactNativeSubpathExportAliases(
  reactNativePath: string
): Record<string, string> | null {
  const exportsMap = readReactNativeExportsMap(reactNativePath);
  if (!exportsMap) {
    return null;
  }

  const aliases: Record<string, string> = {};
  for (const [subpath, target] of Object.entries(exportsMap)) {
    if (
      !subpath.startsWith('./') ||
      subpath.includes('*') ||
      subpath.endsWith('/')
    ) {
      continue;
    }

    const targetPath = getDefaultExportTarget(target);
    if (!targetPath) continue;

    const file = path.join(reactNativePath, targetPath);
    // Already reachable on disk under the requested path (e.g. `./package.json`).
    if (file === path.join(reactNativePath, subpath)) continue;
    if (!fs.existsSync(file)) continue;

    aliases[`react-native/${subpath.slice(2)}$`] = file;
  }

  return Object.keys(aliases).length > 0 ? aliases : null;
}
