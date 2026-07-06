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

    // persistent caching IS enabled here - warning that it is not would be false
    warnLegacyRspackCacheConfig([
      {
        cache: { type: 'persistent' },
        experiments: { cache: { type: 'persistent' } },
      },
    ]);

    expect(warnSpy).not.toHaveBeenCalled();
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
