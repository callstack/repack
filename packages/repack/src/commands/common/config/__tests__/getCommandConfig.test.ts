import { EXPERIMENTAL_CACHE_ENV_KEY } from '../../../../env.js';
import { getCommandConfig } from '../getCommandConfig.js';

describe('getCommandConfig', () => {
  afterEach(() => {
    delete process.env[EXPERIMENTAL_CACHE_ENV_KEY];
  });

  it('should not configure a cache by default', () => {
    expect(getCommandConfig('start', 'rspack')).not.toHaveProperty('cache');
    expect(getCommandConfig('start', 'webpack')).not.toHaveProperty('cache');
  });

  it('should enable the persistent cache for Rspack with the top-level cache option', () => {
    process.env[EXPERIMENTAL_CACHE_ENV_KEY] = 'true';

    const config = getCommandConfig('start', 'rspack');

    expect(config).toHaveProperty('cache', { type: 'persistent' });
    expect(config).not.toHaveProperty('experiments');
  });

  it('should enable the filesystem cache for webpack', () => {
    process.env[EXPERIMENTAL_CACHE_ENV_KEY] = '1';

    expect(getCommandConfig('start', 'webpack')).toHaveProperty('cache', {
      type: 'filesystem',
    });
  });
});
