/* globals __DEV__, __webpack_public_path__, __webpack_get_script_filename__ */

// @ts-ignore
import { NativeModules } from 'react-native';
import { LoadEvent } from '../shared/LoadEvent';

const CACHE_KEY = `Repack.ChunkManager.Cache.${__DEV__ ? 'debug' : 'release'}`;

interface Cache {
  urls: Record<string, string>;
}

/**
 * Interface specifying where a remote chunk is hosted.
 * It represents the output of {@link RemoteChunkResolver} function used by {@link ChunkManager}.
 */
export interface RemoteChunkLocation {
  /**
   * A URL to remote location, where to download a chunk from.
   *
   * Example: for `chunkId: 'TeacherModule'` the `url` can look like this:
   * `https://myapp.com/assets/TeacherModule`.
   */
  url: string;
  /**
   * Whether not to add chunk's default extension by default. If your chunk has different
   * extension than `.chunk.bundle` you should set this flag to `true` and add extension to the `url`.
   */
  excludeExtension?: boolean;
}

/**
 * Defines a function to resolve remote chunk's URL used in {@link ChunkManagerConfig}.
 * It's an async function which should return an object with `url` to a remote location
 * from where {@link ChunkManager} will download the chunk.
 */
export type RemoteChunkResolver = (
  chunkId: string
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

  configure(config: ChunkManagerConfig) {
    this.storage = config.storage;
    this.forceRemoteChunkResolution =
      config.forceRemoteChunkResolution ?? false;
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

    if (__DEV__ && !this.forceRemoteChunkResolution) {
      url = Chunk.fromDevServer(chunkId);
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
    let url;
    let fetch;
    try {
      const resolved = await this.resolveChunk(chunkId);
      url = resolved.url;
      fetch = resolved.fetch;
    } catch (error) {
      console.error(
        'ChunkManager.resolveChunk error:',
        (error as Error).message
      );
      throw new LoadEvent('resolution', chunkId, error);
    }

    try {
      await NativeModules.ChunkManager.loadChunk(chunkId, url, fetch);
    } catch (error) {
      const { message, code } = error as Error & { code: string };
      console.error(
        'ChunkManager.loadChunk invocation failed:',
        message,
        code ? `[${code}]` : ''
      );
      throw new LoadEvent('load', url, error);
    }
  }

  async preloadChunk(chunkId: string) {
    let url;
    let fetch;
    try {
      const resolved = await this.resolveChunk(chunkId);
      url = resolved.url;
      fetch = resolved.fetch;
    } catch (error) {
      console.error(
        'ChunkManager.resolveChunk error:',
        (error as Error).message
      );
      throw new LoadEvent('resolution', chunkId, error);
    }

    try {
      await NativeModules.ChunkManager.preloadChunk(chunkId, url, fetch);
    } catch (error) {
      const { message, code } = error as Error & { code: string };
      console.error(
        'ChunkManager.preloadChunk invocation failed:',
        message,
        code ? `[${code}]` : ''
      );
      throw new LoadEvent('load', url, error);
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
   *
   * This function can be awaited for error handling, but after the functions resolves,
   * it should **not be assumed that the code was executed**.
   *
   * The execution of the code is handled internally by threading in React Native.
   *
   * @param chunkId Id of the chunk.
   */
  static async loadChunk(chunkId: string) {
    return ChunkManager.backend.loadChunk(chunkId);
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
