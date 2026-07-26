import * as colorette from 'colorette';
import type { RspackConfigurationWithLegacyCache } from './resetPersistentCache.js';

let warningDisplayed = false;

function hasPersistentCacheEnabled(config: RspackConfigurationWithLegacyCache) {
  return typeof config.cache === 'object' && config.cache.type === 'persistent';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDeepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return (
      a.length === b.length && a.every((item, i) => isDeepEqual(item, b[i]))
    );
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    return (
      aKeys.length === bKeys.length &&
      aKeys.every((key) => key in b && isDeepEqual(a[key], b[key]))
    );
  }
  return false;
}

/**
 * A legacy `experiments.cache` value carries extra information when it is an
 * object with options beyond `type` that are not mirrored by the top-level
 * `cache` value - Rspack 2 drops those options and runs with defaults.
 * Booleans, a bare `{ type: 'persistent' }` and a value deep-equal to the
 * top-level `cache` are inert leftovers of a completed migration.
 */
function legacyCacheCarriesExtraOptions(
  config: RspackConfigurationWithLegacyCache
) {
  const legacyCache = config.experiments?.cache;
  if (!isPlainObject(legacyCache)) return false;
  const extraKeys = Object.keys(legacyCache).filter((key) => key !== 'type');
  if (extraKeys.length === 0) return false;
  return !isDeepEqual(legacyCache, config.cache);
}

/**
 * Rspack 2 moved the persistent cache configuration from `experiments.cache`
 * to the top-level `cache` option and silently ignores the legacy key
 * (validation is loose) - users migrating a Rspack 1 config would lose
 * persistent caching without any signal.
 *
 * Warn (once) when running Rspack 2 with a legacy `experiments.cache` value:
 * - without a top-level persistent `cache` option, persistent caching is NOT
 *   in effect - warn that it is disabled.
 * - with a top-level persistent `cache` option, caching IS enabled, but any
 *   options that only live under the legacy key are silently dropped - warn
 *   (more softly) that they are not applied. A truly inert leftover (a
 *   boolean, a bare `{ type: 'persistent' }` or a value deep-equal to the
 *   top-level `cache`) stays silent.
 *
 * The config is left untouched - migrating it is the user's move, and
 * mutating it here would make Re.Pack behave differently from bare Rspack
 * given the same config.
 */
export function warnLegacyRspackCacheConfig(
  configs: RspackConfigurationWithLegacyCache[]
) {
  if (warningDisplayed) return;
  const cachingDisabled = configs.some(
    (config) =>
      config.experiments?.cache !== undefined &&
      !hasPersistentCacheEnabled(config)
  );
  const optionsDropped = configs.some(
    (config) =>
      hasPersistentCacheEnabled(config) &&
      legacyCacheCarriesExtraOptions(config)
  );
  if (!cachingDisabled && !optionsDropped) return;
  warningDisplayed = true;
  if (cachingDisabled) {
    console.warn(
      colorette.yellow(
        "Rspack 2 ignores the legacy 'experiments.cache' option, so persistent " +
          "caching is NOT enabled. Move the value to the top-level 'cache' " +
          'option in your Rspack config.\n'
      )
    );
  } else {
    console.warn(
      colorette.yellow(
        "Rspack 2 ignores the legacy 'experiments.cache' option - options set " +
          "there are not applied. Move them to the top-level 'cache' option " +
          'in your Rspack config or remove the key.\n'
      )
    );
  }
}
