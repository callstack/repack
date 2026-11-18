import { describe, expect, it } from 'vitest';
import { getRemoteDevServerOrigins, toOrigin } from '../shared/origins';

describe('getRemoteDevServerOrigins', () => {
  it('collects MF remote and script origins other than the app dev server', () => {
    const origins = getRemoteDevServerOrigins(
      {
        instances: [
          {
            name: 'HostApp',
            remotes: [
              {
                name: 'MiniApp',
                entry: 'http://localhost:8082/android/mf-manifest.json',
                loaded: true,
              },
              { name: 'NoEntry', loaded: false },
            ],
            shared: [],
            loadedModules: [],
          },
        ],
      },
      [
        { locator: { url: 'http://localhost:8081/android/chunk.bundle' } },
        { locator: { url: 'http://localhost:8083/android/remote.bundle' } },
        { locator: { url: 'file:///data/local/chunk.bundle' } },
        {},
      ],
      'http://localhost:8081'
    );
    expect(origins).toEqual(['http://localhost:8082', 'http://localhost:8083']);
  });

  it('only accepts http(s) URLs', () => {
    expect(toOrigin('https://cdn.example.com/a/b.bundle')).toBe(
      'https://cdn.example.com'
    );
    expect(toOrigin('file:///tmp/a')).toBeUndefined();
    expect(toOrigin(undefined)).toBeUndefined();
  });
});
