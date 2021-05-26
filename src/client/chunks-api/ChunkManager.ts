// @ts-ignore
import { NativeModules } from 'react-native';

const CACHE_KEY = 'NativePack.ChunkManager.Cache';

interface Cache {
  urls: Record<string, string>;
}

export type ChunkResolver = (chunkId: string) => Promise<string>;

export interface StorageApi {
  getItem: (key: string) => Promise<string | null | undefined>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

export interface ChunkManagerConfig {
  storage: StorageApi;
  chunkResolver: ChunkResolver;
}

class ChunkManager {
  private cache?: Cache;
  private chunkResolver?: ChunkResolver;
  private storage?: StorageApi;

  configure(config: ChunkManagerConfig) {
    this.storage = config.storage;
    this.chunkResolver = config.chunkResolver;
  }

  private assertConfig() {
    if (!this.chunkResolver) {
      throw new Error(
        'No chunk resolver was provided. Did you forget to add `ChunkManager.configure(...)`?'
      );
    }

    if (!this.storage) {
      throw new Error(
        'No storage implementation was provided. Did you forget to add `ChunkManager.configure(...)`?'
      );
    }
  }

  private async initCache() {
    this.assertConfig();

    if (!this.cache) {
      const cache: Cache | null | undefined = JSON.parse(
        (await this.storage!.getItem(CACHE_KEY)) ?? 'null'
      );
      this.cache = { urls: {}, ...cache };
    }
  }

  private async saveCache() {
    this.assertConfig();

    await this.storage!.setItem(CACHE_KEY, JSON.stringify(this.cache));
  }

  async resolveChunk(
    chunkId: string
  ): Promise<{ url: string; fetch: boolean }> {
    await this.initCache();

    const url = await this.chunkResolver!(chunkId);
    let fetch = false;

    if (!this.cache!.urls[chunkId] || this.cache!.urls[chunkId] !== url) {
      fetch = true;
      this.cache!.urls[chunkId] = url;
      await this.storage!.setItem(CACHE_KEY, JSON.stringify(this.cache));
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
