import { ChunkManagerBackend, DEFAULT_TIMEOUT } from '../ChunkManagerBackend';

class FakeCache {
  data: Record<string, string> = {};

  async setItem(key: string, value: string) {
    this.data[key] = value;
  }

  async getItem(key: string) {
    return this.data[key] ?? null;
  }

  async removeItem(key: string) {
    delete this.data[key];
  }
}

describe('ChunkManager', () => {
  it('should resolve with url only', async () => {
    const manager = new ChunkManagerBackend({});
    const cache = new FakeCache();

    manager.configure({
      storage: cache,
      resolveRemoteChunk: async (chunkId, parentChunkId) => {
        expect(parentChunkId).toEqual('main');

        return {
          url: `http://domain.ext/${chunkId}`,
        };
      },
    });

    const config = await manager.resolveChunk('src_App_js', 'main');
    expect(config).toEqual({
      url: 'http://domain.ext/src_App_js.chunk.bundle',
      fetch: true,
      absolute: false,
      method: 'GET',
      timeout: DEFAULT_TIMEOUT,
    });

    const { fetch } = await manager.resolveChunk('src_App_js', 'main');
    expect(fetch).toBe(false);

    manager.configure({
      storage: cache,
      resolveRemoteChunk: async (chunkId, parentChunkId) => {
        expect(parentChunkId).toEqual('main');

        return {
          url: `http://domain.ext/subpath/${chunkId}`,
        };
      },
    });

    const newConfig = await manager.resolveChunk('src_App_js', 'main');
    expect(newConfig).toEqual({
      url: 'http://domain.ext/subpath/src_App_js.chunk.bundle',
      fetch: true,
      absolute: false,
      method: 'GET',
      timeout: DEFAULT_TIMEOUT,
    });
  });

  it('should resolve with custom extension', async () => {
    const manager = new ChunkManagerBackend({});
    const cache = new FakeCache();

    manager.configure({
      storage: cache,
      resolveRemoteChunk: async (chunkId, parentChunkId) => {
        expect(parentChunkId).toEqual('main');

        return {
          url: `http://domain.ext/${chunkId}.js`,
          excludeExtension: true,
        };
      },
    });

    const config = await manager.resolveChunk('src_App_js', 'main');
    expect(config).toEqual({
      url: 'http://domain.ext/src_App_js.js',
      fetch: true,
      absolute: false,
      method: 'GET',
      timeout: DEFAULT_TIMEOUT,
    });
  });

  it('should resolve with query', async () => {
    const manager = new ChunkManagerBackend({});
    const cache = new FakeCache();

    manager.configure({
      storage: cache,
      resolveRemoteChunk: async (chunkId, parentChunkId) => {
        expect(parentChunkId).toEqual('main');

        return {
          url: `http://domain.ext/${chunkId}`,
          query: {
            accessCode: '1234',
            accessUid: 'asdf',
          },
        };
      },
    });

    const config = await manager.resolveChunk('src_App_js', 'main');
    expect(config).toEqual({
      url: 'http://domain.ext/src_App_js.chunk.bundle',
      fetch: true,
      absolute: false,
      method: 'GET',
      query: 'accessCode=1234&accessUid=asdf',
      timeout: DEFAULT_TIMEOUT,
    });

    manager.configure({
      storage: cache,
      resolveRemoteChunk: async (chunkId, parentChunkId) => {
        expect(parentChunkId).toEqual('main');

        return {
          url: `http://domain.ext/${chunkId}`,
          query: 'token=some_token',
        };
      },
    });

    const { fetch, query } = await manager.resolveChunk('src_App_js', 'main');
    expect(fetch).toBe(true);
    expect(query).toEqual('token=some_token');
  });

  it('should resolve with headers', async () => {
    const manager = new ChunkManagerBackend({});
    const cache = new FakeCache();

    manager.configure({
      storage: cache,
      resolveRemoteChunk: async (chunkId, parentChunkId) => {
        expect(parentChunkId).toEqual('main');

        return {
          url: `http://domain.ext/${chunkId}`,
          headers: {
            'x-hello': 'world',
          },
        };
      },
    });

    const config = await manager.resolveChunk('src_App_js', 'main');
    expect(config).toEqual({
      url: 'http://domain.ext/src_App_js.chunk.bundle',
      fetch: true,
      absolute: false,
      method: 'GET',
      headers: { 'x-hello': 'world' },
      timeout: DEFAULT_TIMEOUT,
    });

    manager.configure({
      storage: cache,
      resolveRemoteChunk: async (chunkId, parentChunkId) => {
        expect(parentChunkId).toEqual('main');

        return {
          url: `http://domain.ext/${chunkId}`,
          headers: {
            'x-hello': 'world',
            'x-changed': 'true',
          },
        };
      },
    });

    const newConfig = await manager.resolveChunk('src_App_js', 'main');
    expect(newConfig).toEqual({
      url: 'http://domain.ext/src_App_js.chunk.bundle',
      fetch: true,
      absolute: false,
      method: 'GET',
      headers: { 'x-hello': 'world', 'x-changed': 'true' },
      timeout: DEFAULT_TIMEOUT,
    });
  });

  it('should resolve with body', async () => {
    const manager = new ChunkManagerBackend({});
    const cache = new FakeCache();

    manager.configure({
      storage: cache,
      resolveRemoteChunk: async (chunkId, parentChunkId) => {
        expect(parentChunkId).toEqual('main');

        return {
          url: `http://domain.ext/${chunkId}`,
          method: 'POST',
          body: 'hello_world',
        };
      },
    });

    const config = await manager.resolveChunk('src_App_js', 'main');
    expect(config).toEqual({
      url: 'http://domain.ext/src_App_js.chunk.bundle',
      fetch: true,
      absolute: false,
      method: 'POST',
      body: 'hello_world',
      timeout: DEFAULT_TIMEOUT,
    });

    manager.configure({
      storage: cache,
      resolveRemoteChunk: async (chunkId, parentChunkId) => {
        expect(parentChunkId).toEqual('main');

        return {
          url: `http://domain.ext/${chunkId}`,
          body: 'message',
          method: 'POST',
        };
      },
    });

    const newConfig = await manager.resolveChunk('src_App_js', 'main');
    expect(newConfig).toEqual({
      url: 'http://domain.ext/src_App_js.chunk.bundle',
      fetch: true,
      absolute: false,
      method: 'POST',
      body: 'message',
      timeout: DEFAULT_TIMEOUT,
    });
  });
});
