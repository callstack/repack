/* globals __DEV__, __webpack_require__ */
import EventEmitter from 'events';
import { getWebpackContext } from './getWebpackContext';
import { Script } from './Script';
import type { ScriptLocatorResolver, StorageApi } from './types';
import NativeScriptManager, {
  NormalizedScriptLocator,
} from './NativeScriptManager';

type Cache = Record<
  string,
  Pick<NormalizedScriptLocator, 'method' | 'url' | 'query' | 'headers' | 'body'>
>;

const CACHE_KEY = `Repack.ScriptManager.Cache.v3.${
  __DEV__ ? 'debug' : 'release'
}`;

/* Options for resolver when adding it to a `ScriptManager`. */
export interface ResolverOptions {
  /**
   * Priority of the resolver. Defaults to `2`.
   * Resolvers are called based on the highest priority,
   * so higher the number, the higher priority the resolver gets.
   */
  priority?: number;
}

/**
 * A manager to ease resolution, downloading and executing additional code from:
 * - arbitrary JavaScript scripts
 * - Webpack chunks
 * - Webpack bundles
 * - Webpack MF containers
 *
 * ScriptManager is globally available under `ScriptManager.shared` in main bundle, chunks and containers.
 *
 * Use `ScriptManager.shared` instead of creating new instance of `ScriptManager`.
 *
 * This API is mainly useful, if you are working with any form of Code Splitting.
 *
 * `ScriptManager` is also an `EventEmitter` and emits the following events:
 * - `resolving` with `{ scriptId, caller }`
 * - `resolved` with `scriptId: string, caller?: string, locator: NormalizedScriptLocator, cache: boolean`
 * - `prefetching` with `scriptId: string, caller?: string, locator: NormalizedScriptLocator, cache: boolean`
 * - `loading` with `scriptId: string, caller?: string, locator: NormalizedScriptLocator, cache: boolean`
 * - `loaded` with `scriptId: string, caller?: string, locator: NormalizedScriptLocator, cache: boolean`
 * - `error` with `error: Error`
 *
 * Example of using this API with async Webpack chunk:
 * ```js
 * import * as React from 'react';
 * import { ScriptManager, Script } from '@callstack/repack/client';
 *
 * ScriptManager.shared.addResolver(async (scriptId) => {
 *   if (__DEV__) {
 *     return {
 *       url: Script.getDevServerURL(scriptId);
 *       cache: false,
 *     };
 *   }
 *
 *   return {
 *     url: Script.getRemoteURL(`http://domain.exaple/apps/${scriptId}`),
 *   };
 * });
 *
 * // ScriptManager.shared.loadScript is called internally when running `import()`
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
export class ScriptManager extends EventEmitter {
  static get shared(): ScriptManager {
    if (!__webpack_require__.repack.shared.scriptManager) {
      __webpack_require__.repack.shared.scriptManager = new ScriptManager();
    }
    return __webpack_require__.repack.shared.scriptManager;
  }

  protected cache: Cache = {};
  protected cacheInitialized = false;
  protected resolvers: [number, ScriptLocatorResolver][] = [];
  protected storage?: StorageApi;

  /**
   * Constructs instance of `ScriptManager`.
   *
   * __Should not be called directly__ - use `ScriptManager.shared`.
   *
   * @internal
   */
  protected constructor(private nativeScriptManager = NativeScriptManager) {
    super();

    if (!nativeScriptManager) {
      throw new Error(
        'repack react-native module was not found.' +
          (__DEV__ ? ' Did you forget to update native dependencies?' : '')
      );
    }

    if (__webpack_require__.repack.shared.scriptManager) {
      throw new Error(
        'ScriptManager was already instantiated. Use ScriptManager.shared instead.'
      );
    }

    __webpack_require__.repack.shared.loadScriptCallback.push = ((
      parentPush: typeof Array.prototype.push,
      ...data: string[][]
    ) => {
      const [[scriptId, caller]] = data;
      this.emit('__loaded__', { scriptId, caller });
      return parentPush(...data);
    }).bind(
      null,
      __webpack_require__.repack.shared.loadScriptCallback.push.bind(
        __webpack_require__.repack.shared.loadScriptCallback
      )
    );

    __webpack_require__.repack.shared.scriptManager = this;
  }

  __destroy() {
    __webpack_require__.repack.shared.scriptManager = undefined;
    __webpack_require__.repack.shared.loadScriptCallback.push =
      Array.prototype.push.bind(
        __webpack_require__.repack.shared.loadScriptCallback
      );
  }

  /**
   * Sets a storage backend to cache resolved scripts locator data.
   *
   * The stored data is used to detect if scripts locator data of previously downloaded
   * script hasn't changed to avoid over-fetching the script.
   *
   * @param storage Implementation of storage functions.
   */
  setStorage(storage?: StorageApi) {
    this.storage = storage;
  }

  /**
   * Adds new script locator resolver.
   *
   * Resolver is an async function to resolve script locator data - in other words, it's a function to
   * tell the {@link ScriptManager} how to fetch the script.
   *
   * There's no limitation on what logic you can run inside this function - it can include:
   * - fetching/loading remote config
   * - fetching/loading feature flags
   * - fetching/loading A/B testing data
   * - calling native modules
   * - running arbitrary logic
   *
   * @param resolver Resolver function to add.
   * @param options Resolver options.
   */
  addResolver(
    resolver: ScriptLocatorResolver,
    { priority = 2 }: ResolverOptions = {}
  ) {
    this.resolvers = this.resolvers
      .concat([[priority, resolver]])
      .sort(([a], [b]) => b - a);
  }

  /**
   * Removes previously added resolver.
   *
   * @param resolver Resolver function to remove.
   * @returns `true` if resolver was found and removed, `false` otherwise.
   */
  removeResolver(resolver: ScriptLocatorResolver): boolean {
    const index = this.resolvers.findIndex(([, item]) => item === resolver);
    if (index > -1) {
      this.resolvers.splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * Removes all previously added resolvers.
   */
  removeAllResolvers() {
    this.resolvers = [];
  }

  protected async initCache() {
    if (!this.cacheInitialized) {
      const cache: Cache | null | undefined = JSON.parse(
        (await this.storage?.getItem(CACHE_KEY)) ?? '{}'
      );
      this.cache = cache ?? {};
      this.cacheInitialized = true;
    }
  }

  protected async saveCache() {
    await this.storage?.setItem(CACHE_KEY, JSON.stringify(this.cache));
  }

  protected handleError(error: any, message: string, ...args: any[]): never {
    console.error(message, ...args, { originalError: error });
    this.emit('error', { message, args, originalError: error });
    throw error;
  }

  /**
   * Resolves a {@link Script} instance with normalized locator data.
   *
   * Resolution will use previously added (via `ScriptManager.shared.addResolver(...)`) resolvers
   * in series, util one returns a locator data or will throw if no resolver handled the request.
   *
   * Use `ScriptManager.shared.on('resolving', ({ scriptId, caller }) => { })` to listen for when
   * the script resolution begins.
   *
   * Use `ScriptManager.shared.on('resolved', (script) => { })` to listen for when
   * the script's locator data is resolved.
   *
   * @param scriptId Id of the script to resolve.
   * @param caller Name of the calling script - it can be for example: name of the bundle, chunk or container.
   */
  async resolveScript(
    scriptId: string,
    caller?: string,
    webpackContext = getWebpackContext()
  ): Promise<Script> {
    await this.initCache();
    try {
      if (!this.resolvers.length) {
        throw new Error(
          'No script resolvers were added. Did you forget to call `ScriptManager.shared.addResolver(...)`?'
        );
      }

      this.emit('resolving', { scriptId, caller });

      let locator;
      for (const [, resolve] of this.resolvers) {
        locator = await resolve(scriptId, caller);
        if (locator) {
          break;
        }
      }

      if (!locator) {
        throw new Error(`No resolver was able to resolve script ${scriptId}`);
      }

      if (typeof locator.url === 'function') {
        locator.url = locator.url(webpackContext);
      }

      const script = Script.from({ scriptId, caller }, locator, false);
      const cacheKey = `${scriptId}_${caller ?? 'unknown'}`;

      // Check if user provided a custom shouldUpdateScript function
      if (locator.shouldUpdateScript) {
        // If so, we need to wait for it to resolve
        const fetch = await locator.shouldUpdateScript(
          scriptId,
          caller,
          script.shouldUpdateCache(this.cache[cacheKey])
        );

        // If it returns true, we need to fetch the script
        if (fetch) {
          script.locator.fetch = true;
          this.cache[cacheKey] = script.getCacheData();
          await this.saveCache();
        }

        this.emit('resolved', script.toObject());

        // if it returns false, we don't need to fetch the script
        return script;
      }

      // If no custom shouldUpdateScript function was provided, we use the default behaviour
      if (!this.cache[cacheKey]) {
        script.locator.fetch = true;
        this.cache[cacheKey] = script.getCacheData();
        await this.saveCache();
      } else if (script.shouldRefetch(this.cache[cacheKey])) {
        script.locator.fetch = true;
        this.cache[cacheKey] = script.getCacheData();
        await this.saveCache();
      }

      this.emit('resolved', script.toObject());

      return script;
    } catch (error) {
      this.handleError(
        error,
        '[ScriptManager] Failed while resolving script locator:',
        { scriptId, caller }
      );
    }
  }

  /**
   * Resolves given script's location, downloads and executes it.
   * The execution of the code is handled internally by threading in React Native.
   *
   * Use `ScriptManager.shared.on('loading', (script) => { })` to listen for when
   * the script is about to be loaded.
   *
   * Use `ScriptManager.shared.on('loaded', (script) => { })` to listen for when
   * the script is loaded.
   *
   * @param scriptId Id of the script to load.
   * @param caller Name of the calling script - it can be for example: name of the bundle, chunk or container.
   */
  async loadScript(
    scriptId: string,
    caller?: string,
    webpackContext = getWebpackContext()
  ) {
    let script = await this.resolveScript(scriptId, caller, webpackContext);
    return await new Promise<void>((resolve, reject) => {
      (async () => {
        const onLoaded = (data: { scriptId: string; caller?: string }) => {
          if (data.scriptId === scriptId && data.caller === caller) {
            this.emit('loaded', script.toObject());
            resolve();
          }
        };

        try {
          this.emit('loading', script.toObject());
          this.on('__loaded__', onLoaded);
          await this.nativeScriptManager.loadScript(scriptId, script.locator);
        } catch (error) {
          const { code } = error as Error & { code: string };
          this.handleError(
            error,
            '[ScriptManager] Failed to load script:',
            code ? `[${code}]` : '',
            script.toObject()
          );
        } finally {
          this.removeListener('__loaded__', onLoaded);
        }
      })().catch((error) => {
        reject(error);
      });
    });
  }

  /**
   * Resolves given script's location and downloads it without executing.
   * This function can be awaited to detect if the script was downloaded and for error handling.
   *
   * Use `ScriptManager.shared.on('prefetching', (script) => { })` to listen for when
   * the script's prefetch beings.
   *
   * @param scriptId Id of the script to prefetch.
   * @param caller Name of the calling script - it can be for example: name of the bundle, chunk or container.
   */
  async prefetchScript(
    scriptId: string,
    caller?: string,
    webpackContext = getWebpackContext()
  ) {
    let script = await this.resolveScript(scriptId, caller, webpackContext);

    try {
      this.emit('prefetching', script.toObject());
      await this.nativeScriptManager.prefetchScript(scriptId, script.locator);
    } catch (error) {
      const { code } = error as Error & { code: string };
      this.handleError(
        error,
        '[ScriptManager] Failed to prefetch script:',
        code ? `[${code}]` : '',
        script.toObject()
      );
    }
  }

  /**
   * Clears the cache (if configured in {@link ScriptManager.setStorage}) and removes downloaded
   * files for given scripts from the filesystem. This function can be awaited to detect if the
   * scripts were invalidated and for error handling.
   *
   * Use `ScriptManager.shared.on('invalidated', (scriptIds) => { })` to listen for when
   * the invalidation completes.
   *
   * @param scriptIds Array of script ids to clear from cache and remove from filesystem.
   */
  async invalidateScripts(scriptIds: string[] = []) {
    try {
      await this.initCache();
      const ids = scriptIds ?? Object.keys(this.cache);

      for (const scriptId of ids) {
        delete this.cache[scriptId];
      }
      await this.saveCache();

      await this.nativeScriptManager.invalidateScripts(ids);
      this.emit('invalidated', ids);
    } catch (error) {
      const { code } = error as Error & { code: string };
      this.handleError(
        error,
        '[ScriptManager] Failed to invalidate scripts:',
        code ? `[${code}]` : ''
      );
    }
  }
}
