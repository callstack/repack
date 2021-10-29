/* globals Headers, FormData */

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

  /**
   * Custom timeout for chunk fetch requests. Defaults to 30s.
   * On iOS this `timeout` is used as a `timeoutInterval`
   * On Android this `timeout` is used as a `readTimeout` and `connectionTimeout`.
   */
  timeout?: number;

  /**
   * If chunk's URL is an absolute path should be set to `true`. Defaults to `false`.
   */
  absolute?: boolean;
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

/**
 * Internal representation of Chunk config specifying it's remote location
 * and the data necessary to fetch it.
 *
 * @internal
 */
export interface ChunkConfig {
  /** HTTP method. */
  method: 'GET' | 'POST';
  /** Path-only URL to a chunk's remote location. */
  url: string;
  /** Whether to fetch chunk from the network or use cached one. */
  fetch: boolean;
  /** Custom timeout for chunk fetch requests. */
  timeout: number;
  /** Whether chunk's URL is an absolute FileSystem URL on a target device. */
  absolute: boolean;
  /** Query params. */
  query?: string;
  /** Request headers. */
  headers?: Record<string, string>;
  /** Request body. */
  body?: string;
}
