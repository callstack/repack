/* globals Headers, FormData */

/**
 * Interface specifying how to fetch a script.
 * It represents the output of {@link ScriptLocatorResolver} function used by {@link ScriptManager}.
 */
export interface ScriptLocator {
  /**
   * A path-only URL to remote location, where to download a script from.
   *
   * Changing this field for the same script, will cause cache invalidation for that script
   * and a fresh version will be downloaded.
   *
   * Example: for `scriptId: 'TeacherModule'` the `url` can look like this:
   * `https://myapp.com/assets/TeacherModule`.
   *
   * **Passing query params might lead to unexpected results. To pass query params use `query` field.**
   */
  url: string;

  /**
   * Query params to append when building the final URL.
   *
   * Changing this field for the same script, will cause cache invalidation for that script
   * and a fresh version will be downloaded.
   */
  query?: string | Record<string, string> | URLSearchParams;

  /**
   * Headers to pass to a script's fetch request.
   *
   * When passing `body`, make sure add content `content-type` header, otherwise `text/plain`
   * will be used.
   *
   * Changing this field for the same script, will cause cache invalidation for that script
   * and a fresh version will be downloaded.
   */
  headers?: Record<string, string> | Headers;

  /**
   * HTTP method used to fetch script.
   *
   * Passing `body` with method `GET` is a no-op. Use `POST` to send `body` data.
   *
   * Changing this field for the same script, will cause cache invalidation for that script
   * and a fresh version will be downloaded.
   */
  method?: 'GET' | 'POST';

  /**
   * HTTP body for a script's fetch request.
   *
   * When passing `body`, make sure the `method` is set to `POST` and a correct
   * `content-type` header is provided.
   *
   * Changing this field for the same script, will cause cache invalidation for that script
   * and a fresh version will be downloaded.
   */
  body?: FormData | URLSearchParams | string | null;

  /**
   * Custom timeout for script fetch requests. Defaults to 30s.
   * On iOS this `timeout` is used as a `timeoutInterval`
   * On Android this `timeout` is used as a `readTimeout` and `connectionTimeout`.
   */
  timeout?: number;

  /**
   * Flag indicating whether the URL is an absolute FileSystem URL on a target device.
   * Useful if you're using custom code to download the script and you want `ScriptManager` to
   * execute it only from a custom FileSystem path.
   * Defaults to `false`.
   */
  absolute?: boolean;
}

/**
 * Defines a function to resolve a script locator used in {@link ScriptManagerConfig}.
 * It's an async function which should return an object with data on how {@link ScriptManager}
 * should fetch the script. All fields describing the script locator data are listed in {@link ScriptLocator}.
 */
export type ScriptLocatorResolver = (
  scriptId: string,
  caller?: string
) => Promise<ScriptLocator>;

/**
 * Interface for storage backend used in {@link ScriptManagerConfig}.
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
 * Configuration options for {@link ScriptManager}.
 */
export interface ScriptManagerConfig {
  /**
   * An async function to resolve script locator data - in other words, it's a function to
   * tell the {@link ScriptManager} how to fetch the script.
   *
   * There's no limitation on what logic you can run inside this function - it can include:
   * - fetching/loading remote config
   * - fetching/loading feature flags
   * - fetching/loading A/B testing data
   * - calling native modules
   * - running arbitrary logic
   */
  resolve: ScriptLocatorResolver;

  /**
   * Optional: A storage backend to cache resolved scripts locator data.
   *
   * The stored data is used to detect if scripts locator data previously downloaded
   * script hasn't changed to avoid over-fetching the script.
   */
  storage?: StorageApi;
}

/**
 * Internal representation of script locator data.
 *
 * @internal
 */
export interface NormalizedScriptLocator {
  /** HTTP method. */
  method: 'GET' | 'POST';

  /** Path-only URL to a script's location. */
  url: string;

  /** Whether to fetch script from the network or use cached one. */
  fetch: boolean;

  /** Custom timeout for script fetch requests. */
  timeout: number;

  /** Whether script's URL is an absolute FileSystem URL on a target device. */
  absolute: boolean;

  /** Query params. */
  query?: string;

  /** Request headers. */
  headers?: Record<string, string>;

  /** Request body. */
  body?: string;
}
