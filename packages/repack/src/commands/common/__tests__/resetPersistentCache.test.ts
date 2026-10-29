import fs from 'node:fs';
import { vol } from 'memfs';
import { resetPersistentCache } from '../resetPersistentCache.js';

jest.mock('node:fs', () => jest.requireActual('memfs').fs);

const rootDir = '/project';

describe('resetPersistentCache', () => {
  beforeEach(() => {
    vol.reset();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('should delete the default Rspack cache directory', () => {
    vol.fromJSON({ '/project/node_modules/.cache/rspack/data': '' });

    resetPersistentCache({
      bundler: 'rspack',
      rootDir,
      cacheConfigs: [{ type: 'persistent' }],
    });

    expect(fs.existsSync('/project/node_modules/.cache/rspack')).toBe(false);
  });

  it('should delete the Rspack persistent cache storage directory', () => {
    vol.fromJSON({
      '/project/node_modules/.cache/rspack/data': '',
      '/project/.cache/rspack/data': '',
    });

    resetPersistentCache({
      bundler: 'rspack',
      rootDir,
      cacheConfigs: [
        {
          type: 'persistent',
          storage: { type: 'filesystem', directory: '.cache/rspack' },
        },
      ],
    });

    expect(fs.existsSync('/project/.cache/rspack')).toBe(false);
    expect(fs.existsSync('/project/node_modules/.cache/rspack')).toBe(true);
  });

  it('should delete the cache directory of a filesystem cache', () => {
    vol.fromJSON({ '/project/.cache/webpack/data': '' });

    resetPersistentCache({
      bundler: 'webpack',
      rootDir,
      cacheConfigs: [{ type: 'filesystem', cacheDirectory: '.cache/webpack' }],
    });

    expect(fs.existsSync('/project/.cache/webpack')).toBe(false);
  });

  it('should not delete a cache directory outside of the project', () => {
    vol.fromJSON({ '/outside/cache/data': '' });

    resetPersistentCache({
      bundler: 'rspack',
      rootDir,
      cacheConfigs: [
        {
          type: 'persistent',
          storage: { type: 'filesystem', directory: '/outside/cache' },
        },
      ],
    });

    expect(fs.existsSync('/outside/cache')).toBe(true);
  });
});
