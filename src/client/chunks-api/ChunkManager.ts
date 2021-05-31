/* globals __DEV__, __CHUNKS__, __webpack_public_path__, __webpack_get_script_filename__ */

// @ts-ignore
import { NativeModules } from 'react-native';

const CACHE_KEY = 'NativePack.ChunkManager.Cache';

interface Cache {
  urls: Record<string, string>;
}

export interface RemoteChunkLocation {
  url: string;
  /**
   * Whether not to add chunk's default extension by default. If your chunk has different
   * extension than `.chunk.bundle` you should set this flag to `true` and add extension to the `url`.
   */
  excludeExtension?: boolean;
}

export type RemoteChunkResolver = (
  chunkId: string
) => Promise<RemoteChunkLocation>;

export interface StorageApi {
  getItem: (key: string) => Promise<string | null | undefined>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

export interface ChunkManagerConfig {
  storage?: StorageApi;
  resolveRemoteChunk?: RemoteChunkResolver;
}

class ChunkManager {
  private cache?: Cache;
  private resolveRemoteChunk?: RemoteChunkResolver;
  private storage?: StorageApi;

  configure(config: ChunkManagerConfig) {
    this.storage = config.storage;
    this.resolveRemoteChunk = config.resolveRemoteChunk;
  }

  private async initCache() {
    if (!this.cache) {
      const cache: Cache | null | undefined = JSON.parse(
        (await this.storage?.getItem(CACHE_KEY)) ?? 'null'
      );
      this.cache = { urls: {}, ...cache };
    }
  }

  private async saveCache() {
    await this.storage?.setItem(CACHE_KEY, JSON.stringify(this.cache));
  }

  async resolveChunk(
    chunkId: string
  ): Promise<{ url: string; fetch: boolean }> {
    await this.initCache();

    let fetch = false;
    let url: string | undefined;

    if (__DEV__) {
      url = Chunk.fromDevServer(chunkId);
    } else if (__CHUNKS__?.['local']?.includes(chunkId)) {
      url = Chunk.fromFileSystem(chunkId);
    } else {
      if (!this.resolveRemoteChunk) {
        throw new Error(
          'No remote chunk resolver was provided. Did you forget to add `ChunkManager.configure({ resolveRemoteChunk: ... })`?'
        );
      }

      const location = await this.resolveRemoteChunk(chunkId);
      url = Chunk.fromRemote(location.url, {
        excludeExtension: location.excludeExtension,
      });
    }

    if (!this.cache!.urls[chunkId] || this.cache!.urls[chunkId] !== url) {
      fetch = true;
      this.cache!.urls[chunkId] = url;
      await this.saveCache();
    }

    return {
      url: this.cache!.urls[chunkId],
      fetch,
    };
  }

  async loadChunk(chunkId: string) {
    try {
      const { url, fetch } = await this.resolveChunk(chunkId);
      await NativeModules.ChunkManager.loadChunk(chunkId, url, fetch);
    } catch (error) {
      console.error(
        'ChunkManager.loadChunk invocation failed:',
        error.message,
        error.code ? `[${error.code}]` : ''
      );
      throw error;
    }
  }

  async preloadChunk(chunkId: string) {
    try {
      const { url, fetch } = await this.resolveChunk(chunkId);
      await NativeModules.ChunkManager.preloadChunk(chunkId, url, fetch);
    } catch (error) {
      console.error(
        'ChunkManager.preloadChunk invocation failed:',
        error.message,
        error.code ? `[${error.code}]` : ''
      );
      throw error;
    }
  }

  async invalidateChunks(chunksIds: string[] = []) {
    try {
      await this.initCache();
      const ids = chunksIds ?? Object.keys(this.cache!.urls);

      for (const chunkId of ids) {
        delete this.cache?.urls[chunkId];
      }
      await this.saveCache();

      await NativeModules.ChunkManager.invalidateChunks(ids);
    } catch (error) {
      console.error(
        'ChunkManager.invalidateChunks invocation failed:',
        error.message,
        error.code ? `[${error.code}]` : ''
      );
      throw error;
    }
  }
}

const ChunkManagerInstance = new ChunkManager();
export { ChunkManagerInstance as ChunkManager };

export const Chunk = {
  fromDevServer(chunkId: string) {
    return `${__webpack_public_path__}${__webpack_get_script_filename__(
      chunkId
    )}`;
  },
  fromFileSystem(chunkId: string) {
    return __webpack_get_script_filename__(`file:///${chunkId}`);
  },
  fromRemote(url: string, options: { excludeExtension?: boolean } = {}) {
    if (options.excludeExtension) {
      return url;
    }

    return __webpack_get_script_filename__(url);
  },
};
