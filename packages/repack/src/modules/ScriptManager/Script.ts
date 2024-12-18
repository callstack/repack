import shallowEqual from 'shallowequal';
import {
  type NormalizedScriptLocator,
  NormalizedScriptLocatorHTTPMethod,
  NormalizedScriptLocatorSignatureVerificationMode,
} from './NativeScriptManager.ts';
import type { ScriptLocator, WebpackContext } from './types.ts';

/**
 * Representation of a Script to load and execute, used by {@link ScriptManager}.
 *
 * When adding resolvers to `ScriptManager` in `ScriptManager.shared.addResolver(...)`, you can use
 * `Script.getDevServerURL(...)`, `Script.getFileSystemURL(...)` or `Script.getRemoteURL(...)`
 * to create a `url` for the script.
 *
 * Other methods are designed for internal use only.
 */
export class Script {
  static DEFAULT_TIMEOUT = 30000; // 30s

  /**
   * Get URL of a script hosted on development server.
   *
   * @param scriptId Id of the script.
   */
  static getDevServerURL(scriptId: string) {
    return (webpackContext: WebpackContext) =>
      `${webpackContext.p}${webpackContext.u(scriptId)}`;
  }

  /**
   * Get URL of a script stored on filesystem on the target mobile device.
   *
   * @param scriptId Id of the script.
   */
  static getFileSystemURL(scriptId: string) {
    return (webpackContext: WebpackContext) =>
      webpackContext.u(`file:///${scriptId}`);
  }

  /**
   * Get URL of a script hosted on a remote server.
   *
   * By default `.chunk.bundle` extension will be added to the URL.
   * If your script has different extension, you should pass `{ excludeExtension: true }` as 2nd argument.
   *
   * @param url A URL to remote location where the script is stored.
   * @param options Additional options.
   */
  static getRemoteURL(
    url: string,
    options: { excludeExtension?: boolean } = {}
  ) {
    if (options.excludeExtension) {
      return url;
    }

    return (webpackContext: WebpackContext) => webpackContext.u(url);
  }

  /**
   * Get unique identifier for the script.
   *
   * Used to create unique identifier for the script, which serves as its key in the cache.
   *
   * @param scriptId Id of the script.
   * @param caller Optional caller name to prefix the script id.
   */
  static getScriptUniqueId(scriptId: string, caller?: string) {
    const prefix = caller ? caller + '_' : '';
    return prefix + scriptId;
  }

  /**
   * Create new instance of `Script` from non-normalized script locator data.
   *
   * @param locator Non-normalized locator data.
   * @param fetch Initial flag for whether script should be fetched or not.
   *
   * @internal
   */
  static from(
    key: { scriptId: string; caller?: string },
    locator: ScriptLocator,
    fetch: boolean
  ) {
    const headers: Record<string, string> = {};
    new Headers(locator.headers).forEach((value: string, key: string) => {
      headers[key.toLowerCase()] = value;
    });

    const uniqueId = Script.getScriptUniqueId(key.scriptId, key.caller);

    let body: NormalizedScriptLocator['body'];
    if (locator.body instanceof FormData) {
      const bodyObject: Record<string, string> = {};
      locator.body.forEach((value, key) => {
        if (typeof value === 'string') {
          bodyObject[key] = value;
        } else {
          console.warn('Script does not support File as FormData key in body');
        }
      });
      body = JSON.stringify(bodyObject);
    } else if (locator.body instanceof URLSearchParams) {
      const bodyObject: Record<string, string> = {};
      locator.body.forEach((value, key) => {
        bodyObject[key] = value;
      });
      body = JSON.stringify(bodyObject);
    } else {
      body = locator.body ?? undefined;
    }

    if (typeof locator.url === 'function') {
      throw new Error('Property url as a function is not support');
    }

    return new Script(
      key.scriptId,
      key.caller,
      {
        uniqueId,
        method:
          (locator.method as NormalizedScriptLocatorHTTPMethod) ??
          NormalizedScriptLocatorHTTPMethod.GET,
        url: locator.url,
        absolute: locator.absolute ?? false,
        timeout: locator.timeout ?? Script.DEFAULT_TIMEOUT,
        retry: locator.retry,
        retryDelay: locator.retryDelay,
        query: new URLSearchParams(locator.query).toString() || undefined,
        body,
        headers: Object.keys(headers).length ? headers : undefined,
        fetch: locator.cache === false ? true : fetch,
        verifyScriptSignature:
          (locator.verifyScriptSignature as NormalizedScriptLocatorSignatureVerificationMode) ??
          NormalizedScriptLocatorSignatureVerificationMode.OFF,
      },
      locator.cache
    );
  }

  /**
   * Constructs new representation of a script.
   *
   * @param locator Normalized locator data.
   * @param cache Flag whether use cache or not, `true` by default.
   *
   * @internal
   */
  constructor(
    public readonly scriptId: string,
    public readonly caller: string | undefined,
    public readonly locator: NormalizedScriptLocator & {
      retry?: number;
      retryDelay?: number;
    },
    public readonly cache: boolean = true
  ) {}

  /**
   * Check if the script was already cached and cache should be updated with new data.
   *
   * @param cachedData Cached data for the same script.
   *
   * @internal
   */
  shouldUpdateCache(
    cachedData: Pick<
      NormalizedScriptLocator,
      'method' | 'url' | 'query' | 'headers' | 'body'
    >
  ) {
    if (!this.cache || !cachedData) {
      return false;
    }

    return this.checkIfCacheDataOutdated(cachedData);
  }

  /**
   * Check if the script should be fetched again or reused,
   * based on previous cached data.
   *
   * @param cachedData Cached data for the same script.
   *
   * @internal
   */
  shouldRefetch(
    cachedData: Pick<
      NormalizedScriptLocator,
      'method' | 'url' | 'query' | 'headers' | 'body'
    >
  ) {
    if (!this.cache) {
      return true;
    }

    return this.checkIfCacheDataOutdated(cachedData);
  }

  /**
   * Check if previous cached data is the same as the new one.
   *
   * @param cachedData Cached data for the same script.
   *
   * @internal
   */
  checkIfCacheDataOutdated(
    cachedData: Pick<
      NormalizedScriptLocator,
      'method' | 'url' | 'query' | 'headers' | 'body'
    >
  ) {
    const diffs = [
      cachedData.method !== this.locator.method,
      cachedData.url !== this.locator.url,
      cachedData.query !== this.locator.query,
      !shallowEqual(cachedData.headers, this.locator.headers),
      cachedData.body !== this.locator.body,
    ];

    return diffs.some((diff) => diff);
  }

  /**
   * Get object to store in cache.
   *
   * @internal
   */
  getCacheData() {
    return {
      method: this.locator.method,
      url: this.locator.url,
      query: this.locator.query,
      headers: this.locator.headers,
      body: this.locator.body,
    };
  }

  toObject() {
    return {
      scriptId: this.scriptId,
      caller: this.caller,
      locator: this.locator,
      cache: this.cache,
    };
  }
}
