/**
 * Internal module hosting the installed-version resolver and the `shared`
 * configuration normalizer, shared between the federation manifest plugin
 * and `utils/defineShared.js`.
 *
 * CONTRACT: this module has ZERO static import edges and reaches Node
 * builtins only via `require()` calls inside function bodies (precedent:
 * `commands/common/config/loadProjectConfig.ts`). It is statically imported
 * by `utils/defineShared.ts`, which is exported from the bundle-facing
 * `utils` barrel — a top-level import here would pull Node builtins into
 * every bundle that imports the barrel. The contract is pinned by
 * `utils/__tests__/browserSafeBarrel.test.ts`; change it only by updating
 * that test deliberately.
 */

/**
 * Normalize every accepted `shared` configuration shape into a flat list of
 * `{ name, config }` pairs. Handles the object map, the array of strings, the
 * array of `{ [name]: config }` wrappers (both plugins) and the
 * `{ name, ...config }` items (`@module-federation/sdk` `SharedItem`).
 */
export function normalizeSharedEntries(
  shared: unknown
): Array<{ name: string; config: Record<string, unknown> }> {
  const entries: Array<{ name: string; config: Record<string, unknown> }> = [];

  const push = (name: string, config: unknown) => {
    entries.push({
      name,
      config:
        typeof config === 'object' && config !== null
          ? (config as Record<string, unknown>)
          : {},
    });
  };

  const fromObject = (obj: Record<string, unknown>) => {
    // `{ react: {...} }` wrapper used by both plugins in array form
    const keys = Object.keys(obj);
    if (
      keys.length === 1 &&
      (typeof obj[keys[0]] === 'object' || typeof obj[keys[0]] === 'string')
    ) {
      push(keys[0], obj[keys[0]]);
      return;
    }
    // `{ name: 'react', singleton: true }` item from @module-federation/sdk
    if (typeof obj.name === 'string') {
      const { name, ...config } = obj;
      push(name, config);
      return;
    }
    // plain `{ [dependencyName]: config | string }` map
    for (const key of keys) {
      push(key, obj[key]);
    }
  };

  if (typeof shared === 'string') {
    push(shared, {});
  } else if (Array.isArray(shared)) {
    for (const item of shared) {
      if (typeof item === 'string') {
        push(item, {});
      } else if (typeof item === 'object' && item !== null) {
        fromObject(item as Record<string, unknown>);
      }
    }
  } else if (typeof shared === 'object' && shared !== null) {
    fromObject(shared as Record<string, unknown>);
  }

  return entries;
}

/**
 * Resolve the installed version of a package relative to `context`.
 * Returns `'unknown'` instead of throwing when the package cannot be located
 * (e.g. deep-import sharing keys like `react-native/`, or missing packages).
 */
export function resolveInstalledVersion(
  packageName: string,
  context: string
): string {
  const fs = require('node:fs') as typeof import('node:fs');
  const path = require('node:path') as typeof import('node:path');
  const { createRequire } =
    require('node:module') as typeof import('node:module');
  const name = packageName.replace(/\/$/, '');
  try {
    const requireFromContext = createRequire(
      path.join(context, 'federation-manifest-resolver.js')
    );
    // Preferred path: the manifest file itself, when the package exports it
    try {
      const pkgJsonPath = requireFromContext.resolve(`${name}/package.json`);
      return readVersion(pkgJsonPath);
    } catch {
      // Fall back to walking up from the main entry point, for packages whose
      // `exports` map does not expose package.json
      const mainPath = requireFromContext.resolve(name);
      let dir = path.dirname(mainPath);
      for (let i = 0; i < 10 && dir !== path.dirname(dir); i++) {
        const candidate = path.join(dir, 'package.json');
        if (fs.existsSync(candidate)) {
          return readVersion(candidate);
        }
        dir = path.dirname(dir);
      }
    }
  } catch {
    // not resolvable from this context
  }
  return 'unknown';
}

function readVersion(packageJsonPath: string): string {
  const fs = require('node:fs') as typeof import('node:fs');
  try {
    const parsed = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as {
      version?: string;
    };
    return parsed.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}
