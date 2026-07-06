import { getRspackCacheConfigs } from '../resetPersistentCache.js';

describe('getRspackCacheConfigs', () => {
  it('should return the legacy experiments.cache config (Rspack 1)', () => {
    const cache = { type: 'persistent' as const };
    expect(getRspackCacheConfigs({ experiments: { cache } })).toEqual([cache]);
  });

  it('should return the top-level cache config (Rspack 2)', () => {
    const cache = {
      type: 'persistent' as const,
      storage: { type: 'filesystem' as const, directory: '.cache/custom' },
    };
    expect(getRspackCacheConfigs({ cache })).toEqual([cache]);
  });

  it('should collect both locations when a config carries both keys', () => {
    // e.g. a dual-major config or defaults merged with a user config -
    // which location is active depends on the installed Rspack major,
    // so both need to be considered when resetting the cache
    const legacyCache = { type: 'persistent' as const };
    const cache = {
      type: 'persistent' as const,
      storage: { type: 'filesystem' as const, directory: '.cache/custom' },
    };
    expect(
      getRspackCacheConfigs({ cache, experiments: { cache: legacyCache } })
    ).toEqual([legacyCache, cache]);
  });

  it('should fall back to a single entry when no cache config is present', () => {
    expect(getRspackCacheConfigs({})).toEqual([undefined]);
    expect(getRspackCacheConfigs({ experiments: {} })).toEqual([undefined]);
  });

  it('should keep boolean cache configs', () => {
    expect(getRspackCacheConfigs({ cache: true })).toEqual([true]);
    expect(getRspackCacheConfigs({ cache: false })).toEqual([false]);
  });
});
