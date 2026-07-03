import * as colorette from 'colorette';
import type { RspackConfigurationWithLegacyCache } from './resetPersistentCache.js';

let warningDisplayed = false;

/**
 * Rspack 2 moved the persistent cache configuration from `experiments.cache`
 * to the top-level `cache` option and silently ignores the legacy key
 * (validation is loose) - users migrating a Rspack 1 config would lose
 * persistent caching without any signal.
 *
 * Warn (once) when running Rspack 2 with a legacy `experiments.cache` value,
 * but leave the config untouched - migrating it is the user's move, and
 * mutating it here would make Re.Pack behave differently from bare Rspack
 * given the same config.
 */
export function warnLegacyRspackCacheConfig(
  configs: RspackConfigurationWithLegacyCache[]
) {
  if (warningDisplayed) return;
  if (configs.every((config) => config.experiments?.cache === undefined)) {
    return;
  }
  warningDisplayed = true;
  console.warn(
    colorette.yellow(
      "Rspack 2 ignores the legacy 'experiments.cache' option, so persistent " +
        "caching is NOT enabled. Move the value to the top-level 'cache' " +
        'option in your Rspack config.\n'
    )
  );
}
