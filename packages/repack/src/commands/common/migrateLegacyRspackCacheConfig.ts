import * as colorette from 'colorette';
import type { RspackConfigurationWithLegacyCache } from './resetPersistentCache.js';

let warningDisplayed = false;

/**
 * Rspack 2 moved the persistent cache configuration from `experiments.cache`
 * to the top-level `cache` option. The legacy key is not validated against -
 * it's silently ignored, which means users migrating a Rspack 1 config would
 * lose persistent caching without any signal.
 *
 * To prevent that, when running Rspack 2 we honor a legacy `experiments.cache`
 * value by moving it to `cache` (unless `cache` is already set) and warn the
 * user to update their project config.
 */
export function migrateLegacyRspackCacheConfig(
  configs: RspackConfigurationWithLegacyCache[]
) {
  for (const config of configs) {
    const legacyCacheConfig = config.experiments?.cache;
    if (legacyCacheConfig === undefined) continue;

    if (config.cache === undefined) {
      config.cache = legacyCacheConfig;
    }
    delete config.experiments?.cache;

    if (!warningDisplayed) {
      warningDisplayed = true;
      console.warn(
        colorette.yellow(
          "In Rspack 2 'experiments.cache' was moved to the top-level 'cache' option " +
            'and the legacy key is silently ignored. ' +
            "Re.Pack applied your 'experiments.cache' value to 'cache' automatically - " +
            "please update your project config to use the top-level 'cache' option.\n"
        )
      );
    }
  }
}
