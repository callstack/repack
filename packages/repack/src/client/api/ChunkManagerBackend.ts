/* globals __DEV__, __repack__, Headers, FormData */

import EventEmitter from 'events';
import shallowEqual from 'shallowequal';
import { LoadEvent } from '../shared/LoadEvent';
import { Chunk } from './Chunk';
import {
  ChunkConfig,
  ChunkManagerConfig,
  RemoteChunkResolver,
  StorageApi,
} from './types';

const CACHE_KEY = `Repack.ChunkManager.Cache.v2.${
  __DEV__ ? 'debug' : 'release'
}`;

export const DEFAULT_TIMEOUT = 30000; // 30s

type Cache = Record<string, Omit<ChunkConfig, 'fetch'>>;

export class ChunkManagerBackend {
  private cache?: Cache;
  private resolveRemoteChunk?: RemoteChunkResolver;
  private storage?: StorageApi;
  private forceRemoteChunkResolution = false;
  private eventEmitter = new EventEmitter();

  constructor(private nativeModule: any) {}

  configure(config: ChunkManagerConfig) {
    this.storage = config.storage;
    this.forceRemoteChunkResolution =
      config.forceRemoteChunkResolution ?? false;
    this.resolveRemoteChunk = config.resolveRemoteChunk;

    __repack__.loadChunkCallback.push = ((
      parentPush: typeof Array.prototype.push,
      ...data: string[]
    ) => {
      this.eventEmitter.emit('loaded', data[0]);
      return parentPush(...data);
    }).bind(
      null,
      __repack__.loadChunkCallback.push.bind(__repack__.loadChunkCallback)
    );
  }

  private async initCache() {
    if (!this.cache) {
      const cache: Cache | null | undefined = JSON.parse(
        (await this.storage?.getItem(CACHE_KEY)) ?? '{}'
      );
      this.cache = cache ?? undefined;
    }
  }

  private async saveCache() {
    await this.storage?.setItem(CACHE_KEY, JSON.stringify(this.cache));
  }

  async resolveChunk(
    chunkId: string,
    parentChunkId?: string
  ): Promise<ChunkConfig> {
    await this.initCache();

    let method: ChunkConfig['method'] = 'GET';
    let url: ChunkConfig['url'];
    let fetch = false;
    let absolute = false;
    let query: ChunkConfig['query'];
    let body: ChunkConfig['body'];
    let headers: ChunkConfig['headers'];
    let timeout: ChunkConfig['timeout'] = DEFAULT_TIMEOUT;

    if (__DEV__ && !this.forceRemoteChunkResolution) {
      url = Chunk.fromDevServer(chunkId);
      fetch = true;
    } else if (
      global.__CHUNKS__?.['local']?.includes(chunkId) &&
      !this.forceRemoteChunkResolution
    ) {
      url = Chunk.fromFileSystem(chunkId);
    } else {
      if (!this.resolveRemoteChunk) {
        throw new Error(
          'No remote chunk resolver was provided. Did you forget to add `ChunkManager.configure({ resolveRemoteChunk: ... })`?'
        );
      }

      const config = await this.resolveRemoteChunk(chunkId, parentChunkId);
      absolute = config.absolute ?? absolute;
      timeout = config.timeout ?? timeout;
      method = config.method ?? method;
      url = Chunk.fromRemote(config.url, {
        excludeExtension: config.excludeExtension,
      });

      if (config.query instanceof URLSearchParams) {
        query = config.query.toString();
      } else if (typeof config.query === 'string') {
        query = config.query;
      } else if (config.query) {
        query = Object.entries(config.query)
          .reduce(
            (acc, [key, value]) => [...acc, `${key}=${value}`],
            [] as string[]
          )
          .join('&');
      }

      if (config.headers instanceof Headers) {
        config.headers.forEach((value, key) => {
          headers = headers ?? {};
          headers[key.toLowerCase()] = value;
        });
      } else if (config.headers) {
        headers = Object.entries(config.headers).reduce(
          (acc, [key, value]) => ({
            ...acc,
            [key.toLowerCase()]: value,
          }),
          {}
        );
      }

      if (config.body instanceof FormData) {
        const tempBody: Record<string, string> = {};
        config.body.forEach((value, key) => {
          if (typeof value === 'string') {
            tempBody[key] = value;
          } else {
            console.warn(
              'ChunkManager.resolveChunk does not support File as FormData key in body'
            );
          }
        });
        body = JSON.stringify(tempBody);
      } else if (config.body instanceof URLSearchParams) {
        const tempBody: Record<string, string> = {};
        config.body.forEach((value, key) => {
          tempBody[key] = value;
        });
        body = JSON.stringify(tempBody);
      } else {
        body = config.body ?? undefined;
      }
    }

    if (
      !this.cache![chunkId] ||
      this.cache![chunkId].url !== url ||
      this.cache![chunkId].query !== query ||
      !shallowEqual(this.cache![chunkId].headers, headers) ||
      this.cache![chunkId].body !== body
    ) {
      fetch = true;
      this.cache![chunkId] = {
        url,
        method,
        query,
        body,
        headers,
        timeout,
        absolute,
      };
      await this.saveCache();
    }

    return {
      ...this.cache![chunkId],
      fetch,
    };
  }

  async loadChunk(chunkId: string, parentChunkId?: string) {
    let config: ChunkConfig;
    try {
      config = await this.resolveChunk(chunkId, parentChunkId);
    } catch (error) {
      console.error(
        'ChunkManager.resolveChunk error:',
        (error as Error).message
      );
      throw new LoadEvent('resolution', chunkId, error);
    }

    try {
      const loadedPromise = new Promise<void>((resolve) => {
        this.eventEmitter.once('loaded', (data: string) => {
          if (data === chunkId) {
            resolve();
          }
        });
      });
      await this.nativeModule.loadChunk(chunkId, config);
      await loadedPromise;
    } catch (error) {
      const { message, code } = error as Error & { code: string };
      console.error(
        'ChunkManager.loadChunk invocation failed:',
        message,
        code ? `[${code}]` : '',
        config
      );
      throw new LoadEvent('load', config.url, error);
    }
  }

  async preloadChunk(chunkId: string, parentChunkId?: string) {
    let config: ChunkConfig;
    try {
      config = await this.resolveChunk(chunkId, parentChunkId);
    } catch (error) {
      console.error(
        'ChunkManager.resolveChunk error:',
        (error as Error).message
      );
      throw new LoadEvent('resolution', chunkId, error);
    }

    try {
      await this.nativeModule.preloadChunk(chunkId, config);
    } catch (error) {
      const { message, code } = error as Error & { code: string };
      console.error(
        'ChunkManager.preloadChunk invocation failed:',
        message,
        code ? `[${code}]` : '',
        config
      );
      throw new LoadEvent('load', config.url, error);
    }
  }

  async invalidateChunks(chunksIds: string[] = []) {
    try {
      await this.initCache();
      const ids = chunksIds ?? Object.keys(this.cache!.urls);

      for (const chunkId of ids) {
        delete this.cache![chunkId];
      }
      await this.saveCache();

      await this.nativeModule.invalidateChunks(ids);
    } catch (error) {
      const { message, code } = error as Error & { code: string };
      console.error(
        'ChunkManager.invalidateChunks invocation failed:',
        message,
        code ? `[${code}]` : ''
      );
      throw error;
    }
  }
}
