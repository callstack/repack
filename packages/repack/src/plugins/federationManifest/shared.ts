import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { FederationManifestSharedEntry } from './types.js';

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
  try {
    const parsed = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as {
      version?: string;
    };
    return parsed.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Build the `shared[]` block: one entry per shared dependency with the
 * installed version resolved from `context`, plus the singleton/eager/
 * requiredVersion values as configured.
 */
export function buildSharedEntries(
  shared: unknown,
  context: string
): FederationManifestSharedEntry[] {
  const versionCache = new Map<string, string>();

  // Skip synthetic deep-import sharing keys with a trailing slash (e.g.
  // `react-native/`, `@react-native/`) auto-injected by the federation
  // plugins. They are webpack prefix-matching markers, not real packages,
  // so they carry no shareable version information.
  const names = normalizeSharedEntries(shared).filter(
    ({ name }) => !name.endsWith('/')
  );

  return names.map(({ name, config }) => {
    if (!versionCache.has(name)) {
      versionCache.set(name, resolveInstalledVersion(name, context));
    }
    return {
      name,
      version: versionCache.get(name) as string,
      singleton: Boolean(config.singleton),
      eager: Boolean(config.eager),
      requiredVersion:
        (typeof config.requiredVersion === 'string' &&
          config.requiredVersion) ||
        (typeof config.version === 'string' && config.version) ||
        '*',
    };
  });
}
