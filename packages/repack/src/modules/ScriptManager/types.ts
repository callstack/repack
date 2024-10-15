export interface WebpackContext {
  p: () => string;
  u: (id: string) => string;
}

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
  url: string | ((webpackContext: WebpackContext) => string);

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
   * Number of times to retry fetching the script in case of failure.
   *
   * If the script fails to download due to network issues or server errors,
   * this field determines how many additional attempts should be made to fetch it.
   * A value of `0` means no retries will be attempted.
   * Defaults to `0` if not specified.
   */
  retry?: number;

  /**
   * Delay in milliseconds between each retry attempt.
   *
   * This field specifies the wait time between consecutive retry attempts
   * if the script download fails. It helps to avoid immediate retries and allows
   * the network or server to recover before trying again.
   * Defaults to `0` if not specified.
   */
  retryDelay?: number;

  /**
   * Flag indicating whether the URL is an absolute FileSystem URL on a target device.
   * Useful if you're using custom code to download the script and you want `ScriptManager` to
   * execute it only from a custom FileSystem path.
   * Defaults to `false`.
   */
  absolute?: boolean;

  /**
   * Flag to disable script caching. By default set to `true`.
   *
   * When `true` (default), it will compare method, url, query, headers and body of
   * previous (if there was) attempt to load the same script. If none of them changed, it
   * will NOT download a new copy of the script, but instead, it will only execute previously
   * downloaded script.
   * Setting this flat to `false`, disables that behavior.
   */
  cache?: boolean;

  /**
   * Flag to enable script's code-signature verification. By default set to `none`
   *
   * `strict` means that the script's code-signature will be verfied regardless of the signature being present in the bundle
   * `lax` means that the script's code-signature will be verfied only when the signature is present in the bundle
   *  if the signature is not present in the bundle, the script will be loaded without verification
   * `off` means that the script's code-signature will not be verfied
   */
  verifyScriptSignature?: 'strict' | 'lax' | 'off';

  /**
   * Function called before loading or getting from the cache and after resolving the script locator.
   * It's an async function which should return a boolean indicating whether the script should be loaded or use default behaviour.
   * This is useful when you want to load a script only when certain conditions are met
   * (e.g. ask user if they want to update/download new version of the script)
   *
   * When `true` is returned, the script will be loaded from the network.
   * When `false` is returned, the script will be loaded from the cache.
   *
   * @param scriptId Id of the script to resolve.
   * @param caller Name of the calling script - it can be for example: name of the bundle, chunk or container.
   * @param isScriptCacheOutdated Boolean indicating whether the script cache is outdated or not. It's `true` when the script
   * cache is outdated and `false` when the script cache is up to date or there is no cache for the script.
   * Outdated cache means that the script was previously downloaded and put into cache,
   * but the script locator data (method, url, query, headers, or body) has changed since then.
   * @returns Boolean indicating whether the script should be loaded or not
   */
  shouldUpdateScript?: (
    scriptId?: string,
    caller?: string,
    isScriptCacheOutdated?: boolean
  ) => Promise<boolean> | boolean;
}

/**
 * Defines a function to resolve a script locator used in {@link ScriptManagerConfig}.
 * It's an async function which should return an object with data on how {@link ScriptManager}
 * should fetch the script. All fields describing the script locator data are listed in {@link ScriptLocator}.
 *
 * Return `undefined` if the script should be resolved by other resolvers instead.
 *
 * @param scriptId Id of the script to resolve.
 * @param caller Name of the calling script - it can be for example: name of the bundle, chunk or container.
 */
export type ScriptLocatorResolver = (
  scriptId: string,
  caller?: string,
  referenceUrl?: string
) => Promise<ScriptLocator | undefined>;

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
