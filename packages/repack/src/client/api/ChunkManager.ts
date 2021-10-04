/* globals __DEV__, __webpack_public_path__, __webpack_get_script_filename__, __repack__, Headers, FormData */

import EventEmitter from 'events';
// @ts-ignore
import { NativeModules } from 'react-native';
import { LoadEvent } from '../shared/LoadEvent';

const CACHE_KEY = `Repack.ChunkManager.Cache.v2.${
  __DEV__ ? 'debug' : 'release'
}`;

interface ChunkConfig {
  method: 'GET' | 'POST';
  url: string;
  fetch: boolean;
  query?: string;
  headers?: Record<string, string>;
  body?: string;
}

type Cache = Record<string, ChunkConfig>;

/**
 * Interface specifying how to fetch a remote chunk.
 * It represents the output of {@link RemoteChunkResolver} function used by {@link ChunkManager}.
 */
export interface RemoteChunkLocation {
  /**
   * A path-only URL to remote location, where to download a chunk from.
   *
   * Changing this field for the same chunk, will cause cache invalidation for that chunk
   * and a fresh version will be downloaded.
   *
   * Example: for `chunkId: 'TeacherModule'` the `url` can look like this:
   * `https://myapp.com/assets/TeacherModule`.
   *
   * **Passing query params might lead to unexpected results. To pass query params use `query` field.**
   */
  url: string;

  /**
   * Whether not to add chunk's default extension by default. If your chunk has different
   * extension than `.chunk.bundle` you should set this flag to `true` and add extension to the `url`.
   */
  excludeExtension?: boolean;

  /**
   * Query params to append when building the final URL.
   *
   * Changing this field for the same chunk, will cause cache invalidation for that chunk
   * and a fresh version will be downloaded.
   */
  query?: string | Record<string, string> | URLSearchParams;

  /**
   * Headers to pass to a remote chunk's fetch request.
   *
   * When passing `body`, make sure add content `content-type` header, otherwise `text/plain`
   * will be used.
   *
   * Changing this field for the same chunk, will cause cache invalidation for that chunk
   * and a fresh version will be downloaded.
   */
  headers?: Record<string, string> | Headers;

  /**
   * HTTP method used to fetch remote chunk.
   *
   * Passing `body` with method `GET` is a no-op. Use `POST` to send `body` data.
   *
   * Changing this field for the same chunk, will cause cache invalidation for that chunk
   * and a fresh version will be downloaded.
   */
  method?: 'GET' | 'POST';

  /**
   * HTTP body for a remote chunk's fetch request.
   *
   * When passing `body`, make sure the `method` is set to `POST` and a correct
   * `content-type` header is provided.
   *
   * Changing this field for the same chunk, will cause cache invalidation for that chunk
   * and a fresh version will be downloaded.
   */
  body?: FormData | URLSearchParams | string | null;
}

/**
 * Defines a function to resolve remote chunk used in {@link ChunkManagerConfig}.
 * It's an async function which should return an object with defining how {@link ChunkManager}
 * should fetch a remote chunk. All fields describing the chunk are listed in {@link RemoteChunkLocation}.
 */
export type RemoteChunkResolver = (
  chunkId: string,
  parentChunkId?: string
) => Promise<RemoteChunkLocation>;

/**
 * Interface for storage backend used in {@link ChunkManagerConfig}.
 * The interface is modelled on Async Storage from `react-native-community`.
 */
export interface StorageApi {
  /** Gets the data for the key. */
  getItem: (key: string) => Promise<string | null | undefined>;
  /** Sets the item value based on the key. */
  setItem: (key: string, value: string) => Promise<void>;
  /** Removes the item based on the key. */
  removeItem: (key: string) => Promise<void>;
}

/**
 * Configuration options for {@link ChunkManager}.
 */
export interface ChunkManagerConfig {
  /**
   * Optional: A storage backend to cache resolved URLs for chunks.
   * The stored data is used to detect if URL to previously downloaded
   * chunk hasn't changed to avoid over-fetching the chunk.
   * If the perviously resolved URL matches new URL, the chunk won't be downloaded
   * again and the previously downloaded chunk will be executed instead.
   */
  storage?: StorageApi;

  /**
   * An async function to resolve URL to remote chunks hosted on remove servers.
   * You can use remote config, feature flags or A/B testing inside this function
   * return different URLs based on this logic.
   */
  resolveRemoteChunk: RemoteChunkResolver;

  /**
   * Forces `ChunkManager` to always use `resolveRemoteChunk` function to resolve location
   * of a chunk, regardless if the chunk is marked as local chunk or if the development server
   * is running.
   */
  forceRemoteChunkResolution?: boolean;
}

class ChunkManagerBackend {
  private cache?: Cache;
  private resolveRemoteChunk?: RemoteChunkResolver;
  private storage?: StorageApi;
  private forceRemoteChunkResolution = false;
  private eventEmitter = new EventEmitter();

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
    let query: ChunkConfig['query'];
    let body: ChunkConfig['body'];
    let headers: ChunkConfig['headers'];

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
      this.cache![chunkId].query !== query
    ) {
      fetch = true;
      this.cache![chunkId] = {
        url,
        fetch,
        method,
        query,
        body,
        headers,
      };
      await this.saveCache();
    }

    return this.cache![chunkId];
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
      await NativeModules.ChunkManager.loadChunk(chunkId, config);
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
      await NativeModules.ChunkManager.preloadChunk(chunkId, config);
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

      await NativeModules.ChunkManager.invalidateChunks(ids);
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

/**
 * A manager to ease resolving, downloading and executing additional code from async chunks or
 * any arbitrary JavaScript files.
 *
 * - In development mode, all chunks will be resolved and downloaded from the Development server.
 * - In production mode, local chunks will be resolved and loaded from filesystem and remote
 * chunks will be resolved and downloaded based on the `resolveRemoteChunk` function.
 * - You can force all resolution, regardless of the mode, to go through `resolveRemoteChunk`
 * function by setting `forceRemoteChunkResolution: true` in `ChunkManager.configure(...)`.
 *
 * This API is only useful if you are working with any form of Code Splitting.
 *
 * Example of using this API with async chunks:
 * ```js
 * import * as React from 'react';
 * import { ChunkManager } from '@callstack/repack/client';
 *
 * ChunkManager.configure({
 *   resolveRemoteChunk: async (chunkId) => {
 *     return {
 *       url: `http://domain.exaple/apps/${chunkId}`,
 *     };
 *   },
 * });
 *
 * // ChunkManager.loadChunk is called internally when running `import()`
 * const TeacherModule = React.lazy(() => import('./Teacher.js'));
 * const StudentModule = React.lazy(() => import('./Student.js'));
 *
 * export function App({ role }) {
 *   if (role === 'teacher') {
 *     return <TeacherModule />;
 *   }
 *
 *   return <StudentModule />
 * }
 * ```
 */
export class ChunkManager {
  /**
   * A instance of `ChunkManagerBackend`.
   * Should not be used directly.
   *
   * @internal
   */
  private static backend = new ChunkManagerBackend();

  /**
   * Configures `ChunkManager` to be able to resolve location of additional
   * chunks (or arbitrary code) in production.
   * Optionally, it also allows to set up caching to avoid over-fetching of chunks.
   *
   * @param config Configuration options.
   */
  static configure(config: ChunkManagerConfig) {
    ChunkManager.backend.configure(config);
  }

  /**
   * Resolves a URL to a given chunks and  whether to download a chunk
   * or reuse previously downloaded one.
   *
   * @param chunkId Id of the chunk.
   * @returns Promise with chunk's URL as `url` and a boolean `fetch` whether to download a chunk
   * or reuse previously downloaded one.
   */
  static async resolveChunk(chunkId: string) {
    return ChunkManager.backend.resolveChunk(chunkId);
  }

  /**
   * Resolves given chunk's location, download and execute it.
   * Once the returned Promise is resolved, the code should have been evaluated.
   *
   * The execution of the code is handled internally by threading in React Native.
   *
   * @param chunkId Id of the chunk.
   * @param parentChunkId Id of the parent chunk.
   */
  static async loadChunk(chunkId: string, parentChunkId?: string) {
    return ChunkManager.backend.loadChunk(chunkId, parentChunkId);
  }

  /**
   * Resolves given chunk's location and download it without executing.
   *
   * This function can be awaited to detect if the chunk was downloaded and for error handling.
   *
   * @param chunkId Id of the chunk.
   */
  static async preloadChunk(chunkId: string) {
    return ChunkManager.backend.preloadChunk(chunkId);
  }

  /**
   * Clears the cache (if configured in {@link ChunkManager.configure}) and removes downloaded
   * files for given chunks from the filesystem.
   *
   * This function can be awaited to detect if the chunks were invalidated and for error handling.
   *
   * @param chunksIds Array of chunk Ids to clear from cache and remove from filesystem.
   */
  static async invalidateChunks(chunksIds: string[] = []) {
    return ChunkManager.backend.invalidateChunks(chunksIds);
  }
}

/**
 * A helper class to ease the creation of of chunk based on it's location.
 *
 * **You should not need to use this.**
 *
 * @internal
 */
export class Chunk {
  /**
   * Creates definition for a chunk hosted on development server.
   *
   * @param chunkId Id of the chunk.
   * @returns Chunk definition.
   */
  static fromDevServer(chunkId: string) {
    return `${__webpack_public_path__}${__webpack_get_script_filename__(
      chunkId
    )}`;
  }

  /**
   * Creates definition for a chunk stored on filesystem on the target mobile device.
   *
   * @param chunkId Id of the chunk.
   * @returns Chunk definition.
   */
  static fromFileSystem(chunkId: string) {
    return __webpack_get_script_filename__(`file:///${chunkId}`);
  }

  /**
   * Creates definition for a chunk hosted on a remote server.
   *
   * @param url A URL to remote location where the chunk is stored.
   * @param options Additional options.
   * @returns Chunk definition.
   */
  static fromRemote(url: string, options: { excludeExtension?: boolean } = {}) {
    if (options.excludeExtension) {
      return url;
    }

    return __webpack_get_script_filename__(url);
  }
}
