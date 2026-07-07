describe('warnLegacyRspackCacheConfig', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    // the helper keeps module-level once-only state - re-evaluate it per test
    jest.resetModules();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  const loadHelper = () => {
    // require instead of import so jest.resetModules() re-evaluates the module
    const module: typeof import(
      '../warnLegacyRspackCacheConfig.js'
    ) = require('../warnLegacyRspackCacheConfig.js');
    return module.warnLegacyRspackCacheConfig;
  };

  it('does not warn when no config uses the legacy experiments.cache key', () => {
    const warnLegacyRspackCacheConfig = loadHelper();

    warnLegacyRspackCacheConfig([
      {},
      { cache: true },
      { cache: { type: 'persistent' } },
      { experiments: {} },
    ]);

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('warns when a config has experiments.cache and no top-level cache', () => {
    const warnLegacyRspackCacheConfig = loadHelper();

    warnLegacyRspackCacheConfig([
      { experiments: { cache: { type: 'persistent' } } },
    ]);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/experiments\.cache/);
    expect(warnSpy.mock.calls[0][0]).toMatch(/top-level 'cache'/);
  });

  it('warns for the typical Rspack 1 shape (cache: true + experiments.cache)', () => {
    const warnLegacyRspackCacheConfig = loadHelper();

    // under Rspack 2 `cache: true` enables the memory cache only,
    // so persistent caching is still not in effect
    warnLegacyRspackCacheConfig([
      { cache: true, experiments: { cache: { type: 'persistent' } } },
    ]);

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('warns when top-level cache is memory-only next to the legacy key', () => {
    const warnLegacyRspackCacheConfig = loadHelper();

    warnLegacyRspackCacheConfig([
      {
        cache: { type: 'memory' },
        experiments: { cache: { type: 'persistent' } },
      },
    ]);

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('does not warn for a migrated config that only left the inert legacy key behind', () => {
    const warnLegacyRspackCacheConfig = loadHelper();

    // persistent caching IS enabled and the legacy key carries no options
    // beyond `type` - there is nothing Rspack 2 could drop
    warnLegacyRspackCacheConfig([
      {
        cache: {
          type: 'persistent',
          storage: { type: 'filesystem', directory: '/custom' },
        },
        experiments: { cache: { type: 'persistent' } },
      },
    ]);

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does not warn when the legacy key is deep-equal to the top-level cache', () => {
    const warnLegacyRspackCacheConfig = loadHelper();

    // every option under the legacy key is mirrored at the top level,
    // so ignoring the legacy key changes nothing
    warnLegacyRspackCacheConfig([
      {
        cache: {
          type: 'persistent',
          storage: { type: 'filesystem', directory: '/custom' },
          buildDependencies: ['/project/rspack.config.mjs'],
        },
        experiments: {
          cache: {
            type: 'persistent',
            storage: { type: 'filesystem', directory: '/custom' },
            buildDependencies: ['/project/rspack.config.mjs'],
          },
        },
      },
    ]);

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('warns softly for a partial migration that leaves options under the legacy key', () => {
    const warnLegacyRspackCacheConfig = loadHelper();

    // persistent caching IS enabled, but the storage directory only lives
    // under the legacy key - Rspack 2 drops it and uses the default location
    warnLegacyRspackCacheConfig([
      {
        cache: { type: 'persistent' },
        experiments: {
          cache: {
            type: 'persistent',
            storage: { type: 'filesystem', directory: '/custom' },
          },
        },
      },
    ]);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/experiments\.cache/);
    expect(warnSpy.mock.calls[0][0]).toMatch(/not applied/);
    // caching IS enabled - the soft warning must not claim otherwise
    expect(warnSpy.mock.calls[0][0]).not.toMatch(/NOT enabled/);
  });

  it('warns strongly when legacy options come without a top-level persistent cache', () => {
    const warnLegacyRspackCacheConfig = loadHelper();

    warnLegacyRspackCacheConfig([
      {
        experiments: {
          cache: {
            type: 'persistent',
            storage: { type: 'filesystem', directory: '/custom' },
          },
        },
      },
    ]);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/NOT enabled/);
  });

  it('prefers the strong warning when configs trigger both tiers', () => {
    const warnLegacyRspackCacheConfig = loadHelper();

    warnLegacyRspackCacheConfig([
      {
        cache: { type: 'persistent' },
        experiments: {
          cache: {
            type: 'persistent',
            storage: { type: 'filesystem', directory: '/custom' },
          },
        },
      },
      { experiments: { cache: { type: 'persistent' } } },
    ]);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/NOT enabled/);
  });

  it('warns when any config of a multi-config array is misconfigured', () => {
    const warnLegacyRspackCacheConfig = loadHelper();

    warnLegacyRspackCacheConfig([
      {
        cache: { type: 'persistent' },
        experiments: { cache: { type: 'persistent' } },
      },
      { experiments: { cache: { type: 'persistent' } } },
    ]);

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('warns only once across repeated calls', () => {
    const warnLegacyRspackCacheConfig = loadHelper();

    warnLegacyRspackCacheConfig([
      { experiments: { cache: { type: 'persistent' } } },
    ]);
    warnLegacyRspackCacheConfig([
      { experiments: { cache: { type: 'persistent' } } },
    ]);

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});
