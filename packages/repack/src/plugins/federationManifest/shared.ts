import {
  normalizeSharedEntries,
  resolveInstalledVersion,
} from '../../utils/sharedVersionResolver.js';
import type { FederationManifestSharedEntry } from './types.js';

// The resolver and the normalizer moved to `utils/sharedVersionResolver.js`
// (lazily builtin-accessing) so `utils/defineShared` can share them without
// pulling Node builtins into the bundle-facing utils barrel. They stay
// re-exported here so every existing importer keeps resolving through
// './shared.js'.
export {
  normalizeSharedEntries,
  resolveInstalledVersion,
} from '../../utils/sharedVersionResolver.js';

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
