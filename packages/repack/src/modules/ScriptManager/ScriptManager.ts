// biome-ignore lint/style/useNodejsImportProtocol: use 'events' module instead of node builtin
import EventEmitter from 'events';
import { AsyncSeriesBailHook, AsyncSeriesWaterfallHook } from 'tapable';
import NativeScriptManager, {
  type NormalizedScriptLocator,
} from './NativeScriptManager.js';
import { Script } from './Script.js';
import { getWebpackContext } from './getWebpackContext.js';
import type {
  ScriptLocator,
  ScriptLocatorResolver,
  StorageApi,
} from './types.js';

type Cache = Record<
  string,
  Pick<NormalizedScriptLocator, 'method' | 'url' | 'query' | 'headers' | 'body'>
>;

type ScriptsPromises = Record<
  string,
  (Promise<void> & { isPrefetch?: true }) | undefined
>;

const DEFAULT_RESOLVER_PRIORITY = 2;
const DEFAULT_RESOLVER_KEY = '__default__';

const CACHE_NAME = 'Repack.ScriptManager.Cache';
const CACHE_VERSION = 'v4';
const CACHE_ENV = __DEV__ ? 'debug' : 'release';

const CACHE_KEY = [CACHE_NAME, CACHE_VERSION, CACHE_ENV].join('.');

const LOADING_ERROR_CODES = [
  // android
  'NetworkFailure',
  'RequestFailure',
  // ios
  'ScriptDownloadFailure',
];

function promisify<T extends (...args: any[]) => any>(fn: T) {
  return async (...args: Parameters<T>) => fn(...args);
}

/* Options for resolver when adding it to a `ScriptManager`. */
export interface ResolverOptions {
  /**
   * Priority of the resolver. Defaults to `2`.
   * Resolvers are called based on the highest priority,
   * so higher the number, the higher priority the resolver gets.
   */
  priority?: number;
  /**
   * Unique key to identify the resolver.
   * If not provided, the resolver will be added unconditionally.
   * If provided, the new resolver will be replace the existing one configured with the same `uniqueKey`.
   */
  key?: string;
}

interface ResolveScriptOptions {
  scriptId: string;
  caller?: string;
  webpackContext: RepackRuntimeGlobals.WebpackRequire;
  referenceUrl?: string;
}

interface LoadScriptOptions extends ResolveScriptOptions {}

interface ResolveHookOptions {
  options: ResolveScriptOptions;
  resolvers: Array<[string, string | number, ScriptLocatorResolver]>;
}

interface BeforeResolveHookOptions {
  options: ResolveScriptOptions;
}

interface AfterResolveHookOptions {
  options: ResolveScriptOptions;
  locator: ScriptLocator;
}

interface ErrorResolveHookOptions {
  options: ResolveScriptOptions;
  error: Error;
}

interface BeforeLoadHookOptions {
  options: LoadScriptOptions;
  script: Script;
}

interface LoadHookOptions {
  options: LoadScriptOptions;
  script: Script;
  loadScript: (
    scriptId?: string,
    locator?: NormalizedScriptLocator & { retryDelay?: number; retry?: number }
  ) => Promise<void>;
}

interface AfterLoadHookOptions {
  options: LoadScriptOptions;
  script: Script;
}

interface ErrorLoadHookOptions {
  options: LoadScriptOptions;
  error: Error;
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
  static init() {
    if (!__webpack_require__.repack.shared.scriptManager) {
      __webpack_require__.repack.shared.scriptManager = new ScriptManager();
    }
  }

  static get shared(): ScriptManager {
    return __webpack_require__.repack.shared.scriptManager!;
  }

  protected cache: Cache = {};
  protected scriptsPromises: ScriptsPromises = {};
  protected cacheInitialized = false;
  protected resolvers: Array<[string, string | number, ScriptLocatorResolver]> =
    [];
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

    __webpack_require__.repack.shared.scriptManager = this;
  }

  private hookMap = {
    beforeResolve: new AsyncSeriesWaterfallHook<
      BeforeResolveHookOptions,
      BeforeResolveHookOptions
    >(['args']),
    resolve: new AsyncSeriesBailHook<
      ResolveHookOptions,
      ScriptLocator | undefined
    >(['args']),
    afterResolve: new AsyncSeriesWaterfallHook<
      AfterResolveHookOptions,
      AfterResolveHookOptions
    >(['args']),
    errorResolve: new AsyncSeriesBailHook<
      ErrorResolveHookOptions,
      ScriptLocator | undefined
    >(['args']),
    beforeLoad: new AsyncSeriesWaterfallHook<
      BeforeLoadHookOptions,
      BeforeLoadHookOptions
    >(['args']),
    load: new AsyncSeriesBailHook<LoadHookOptions, boolean>(['args']),
    afterLoad: new AsyncSeriesWaterfallHook<
      AfterLoadHookOptions,
      AfterLoadHookOptions
    >(['args']),
    errorLoad: new AsyncSeriesBailHook<ErrorLoadHookOptions, boolean>(['args']),
  };

  public hooks = {
    beforeResolve: (
      fn: (args: BeforeResolveHookOptions) => Promise<BeforeResolveHookOptions>
    ) => this.hookMap.beforeResolve.tapPromise('beforeResolve', promisify(fn)),
    resolve: (
      fn: (args: ResolveHookOptions) => Promise<ScriptLocator | undefined>
    ) => this.hookMap.resolve.tapPromise('resolve', promisify(fn)),
    afterResolve: (
      fn: (args: AfterResolveHookOptions) => Promise<AfterResolveHookOptions>
    ) => this.hookMap.afterResolve.tapPromise('afterResolve', promisify(fn)),
    errorResolve: (
      fn: (
        args: ErrorResolveHookOptions
      ) => Promise<ScriptLocator | undefined | void>
    ) => this.hookMap.errorResolve.tapPromise('errorResolve', promisify(fn)),
    beforeLoad: (
      fn: (args: BeforeLoadHookOptions) => Promise<BeforeLoadHookOptions>
    ) => this.hookMap.beforeLoad.tapPromise('beforeLoad', promisify(fn)),
    load: (fn: (args: LoadHookOptions) => Promise<boolean>) =>
      this.hookMap.load.tapPromise('load', promisify(fn)),
    afterLoad: (
      fn: (args: AfterLoadHookOptions) => Promise<AfterLoadHookOptions>
    ) => this.hookMap.afterLoad.tapPromise('afterLoad', promisify(fn)),
    errorLoad: (
      fn: (args: ErrorLoadHookOptions) => Promise<boolean | undefined | void>
    ) => this.hookMap.errorLoad.tapPromise('errorLoad', promisify(fn)),
  };

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
  addResolver(resolver: ScriptLocatorResolver, options: ResolverOptions = {}) {
    const priority = options.priority ?? DEFAULT_RESOLVER_PRIORITY;
    const uniqueKey = options.key;

    this.resolvers = this.resolvers
      .filter(([key]) => key !== uniqueKey)
      .concat([[uniqueKey ?? DEFAULT_RESOLVER_KEY, priority, resolver]])
      .sort(([, a], [, b]) => Number(b) - Number(a));
  }

  /**
   * Removes previously added resolver.
   *
   * @param resolver Resolver function or resolver's `uniqueKey` to remove.
   * @returns `true` if resolver was found and removed, `false` otherwise.
   */
  removeResolver(resolver: ScriptLocatorResolver | string): boolean {
    let index: number;
    if (typeof resolver === 'string') {
      index = this.resolvers.findIndex(([key]) => key === resolver);
    } else {
      index = this.resolvers.findIndex(([, , item]) => item === resolver);
    }

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
      const cacheEntry = await this.storage?.getItem(CACHE_KEY);
      this.cache = cacheEntry ? JSON.parse(cacheEntry) : {};
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
    webpackContext?: RepackRuntimeGlobals.WebpackRequire,
    referenceUrl?: string
  ): Promise<Script>;

  async resolveScript(
    _scriptId: string,
    _caller?: string,
    _webpackContext = getWebpackContext(),
    _referenceUrl?: string
  ): Promise<Script> {
    let options: ResolveScriptOptions = {
      scriptId: _scriptId,
      caller: _caller,
      referenceUrl: _referenceUrl,
      webpackContext: _webpackContext,
    };

    let locator: ScriptLocator | undefined;

    try {
      await this.initCache();

      if (!this.resolvers.length) {
        throw new Error(
          'No script resolvers were added. Did you forget to call `ScriptManager.shared.addResolver(...)`?'
        );
      }

      if (this.hookMap.beforeResolve.isUsed()) {
        ({ options } = await this.hookMap.beforeResolve.promise({ options }));
      }

      this.emit('resolving', {
        scriptId: options.scriptId,
        caller: options.caller,
      });

      if (this.hookMap.resolve.isUsed()) {
        // obtain the result from custom implementation through the resolve hook
        locator = await this.hookMap.resolve.promise({
          options,
          resolvers: this.resolvers,
        });
      } else {
        // obtain the result from default implementation
        for (const [, , resolve] of this.resolvers) {
          const resolvedLocator = await resolve(
            options.scriptId,
            options.caller,
            options.referenceUrl
          );
          if (resolvedLocator) {
            locator = resolvedLocator;
            break;
          }
        }
      }

      if (!locator) {
        throw new Error(
          `No resolver was able to resolve script ${options.scriptId}`
        );
      }

      if (this.hookMap.afterResolve.isUsed()) {
        ({ options, locator } = await this.hookMap.afterResolve.promise({
          options,
          locator,
        }));
      }

      if (typeof locator.url === 'function') {
        locator.url = locator.url(options.webpackContext);
      }
    } catch (error) {
      locator = await this.hookMap.errorResolve.promise({
        options,
        error: error as Error,
      });

      if (!locator) {
        this.handleError(
          error,
          '[ScriptManager] Failed while resolving script locator:',
          { scriptId: options.scriptId, caller: options.caller }
        );
      }
    }

    try {
      const script = await this.createScript(
        options.scriptId,
        options.caller,
        locator
      );
      this.emit('resolved', script.toObject());
      return script;
    } catch (error) {
      this.handleError(error, '[ScriptManager] Failed while creating script:', {
        scriptId: options.scriptId,
        caller: options.caller,
      });
    }
  }

  private async createScript(
    scriptId: string,
    caller: string | undefined,
    locator: ScriptLocator
  ) {
    const script = Script.from({ scriptId, caller }, locator, false);
    const cacheKey = script.locator.uniqueId;

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
      }
    } else {
      // If no custom shouldUpdateScript function was provided, we use the default behaviour
      if (!this.cache[cacheKey]) {
        script.locator.fetch = true;
      } else if (script.shouldRefetch(this.cache[cacheKey])) {
        script.locator.fetch = true;
      }
    }

    return script;
  }

  private async updateCache(script: Script) {
    if (script.locator.fetch) {
      const cacheKey = script.locator.uniqueId;
      this.cache[cacheKey] = script.getCacheData();
      await this.saveCache();
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
    webpackContext?: RepackRuntimeGlobals.WebpackRequire,
    referenceUrl?: string
  ): Promise<void>;

  async loadScript(
    _scriptId: string,
    _caller?: string,
    _webpackContext = getWebpackContext(),
    _referenceUrl?: string
  ) {
    let options: LoadScriptOptions = {
      scriptId: _scriptId,
      caller: _caller,
      referenceUrl: _referenceUrl,
      webpackContext: _webpackContext,
    };

    let loaded = false;

    const uniqueId = Script.getScriptUniqueId(options.scriptId, options.caller);

    if (this.scriptsPromises[uniqueId]) {
      const { isPrefetch } = this.scriptsPromises[uniqueId];

      // prefetch is not execute the script so we need to run loadScript if promise is for prefetch
      if (isPrefetch) {
        await this.scriptsPromises[uniqueId];
      } else {
        return this.scriptsPromises[uniqueId];
      }
    }

    const loadProcess = async () => {
      let script = await this.resolveScript(
        options.scriptId,
        options.caller,
        options.webpackContext,
        options.referenceUrl
      );

      try {
        if (this.hookMap.beforeLoad.isUsed()) {
          ({ options, script } = await this.hookMap.beforeLoad.promise({
            options,
            script,
          }));
        }

        this.emit('loading', script.toObject());

        if (this.hookMap.load.isUsed()) {
          loaded = await this.hookMap.load.promise({
            options,
            script,
            loadScript: async (
              scriptId = options.scriptId,
              locator = script.locator
            ) => {
              await this.loadScriptWithRetry(scriptId, locator);
            },
          });
        } else {
          await this.loadScriptWithRetry(options.scriptId, script.locator);
          loaded = true;
        }

        if (this.hookMap.afterLoad.isUsed()) {
          ({ options, script } = await this.hookMap.afterLoad.promise({
            options,
            script,
          }));
        }

        this.emit('loaded', script.toObject());
        await this.updateCache(script);
      } catch (error) {
        const { code } = error as Error & { code: string };
        loaded = await this.hookMap.errorLoad.promise({
          options,
          error: error as Error,
        });
        if (!loaded) {
          this.handleError(
            error,
            '[ScriptManager] Failed to load script:',
            code ? `[${code}]` : '',
            script.toObject()
          );
        }
      } finally {
        // should delete script promise even script failed
        delete this.scriptsPromises[uniqueId];
      }
    };

    this.scriptsPromises[uniqueId] = loadProcess();
    return this.scriptsPromises[uniqueId];
  }

  /**
   * Loads a script with retry logic.
   *
   * This function attempts to load a script using the nativeScriptManager.
   * If the initial attempt fails, it retries the specified number of times
   * with an optional delay between retries.
   *
   * @param {string} scriptId - The ID of the script to load.
   * @param {NormalizedScriptLocator} locator - An NormalizedScriptLocator containing retry configuration.
   * @param {number} [locator.retry=0] - The number of retry attempts.
   * @param {number} [locator.retryDelay=0] - The delay in milliseconds between retries.
   * @throws {Error} Throws an error if all retry attempts fail.
   */
  protected async loadScriptWithRetry(
    scriptId: string,
    locator: NormalizedScriptLocator & { retryDelay?: number; retry?: number }
  ) {
    const { retry = 0, retryDelay = 0 } = locator;
    let attempts = retry + 1; // Include the initial attempt

    while (attempts > 0) {
      try {
        await this.nativeScriptManager.loadScript(scriptId, locator);
        return; // Successfully loaded the script, exit the loop
      } catch (error) {
        attempts--;
        const { code } = error as Error & { code: string };
        if (attempts > 0 && LOADING_ERROR_CODES.includes(code)) {
          if (retryDelay > 0) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          }
        } else {
          throw error; // No more retries, throw the error
        }
      }
    }
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
    const uniqueId = Script.getScriptUniqueId(scriptId, caller);
    if (this.scriptsPromises[uniqueId]) {
      return this.scriptsPromises[uniqueId];
    }
    const loadProcess = async () => {
      const script = await this.resolveScript(scriptId, caller, webpackContext);

      try {
        this.emit('prefetching', script.toObject());
        await this.nativeScriptManager.prefetchScript(scriptId, script.locator);
        await this.updateCache(script);
      } catch (error) {
        const { code } = error as Error & { code: string };
        this.handleError(
          error,
          '[ScriptManager] Failed to prefetch script:',
          code ? `[${code}]` : '',
          script.toObject()
        );
      } finally {
        // should delete script promise even script failed
        delete this.scriptsPromises[uniqueId];
      }
    };

    this.scriptsPromises[uniqueId] = loadProcess();
    this.scriptsPromises[uniqueId].isPrefetch = true;
    return this.scriptsPromises[uniqueId];
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
   * @returns Array of script ids that were invalidated.
   */
  async invalidateScripts(scriptIds: string[] = []) {
    try {
      await this.initCache();

      const ids = scriptIds.length ? scriptIds : Object.keys(this.cache);
      ids.forEach((scriptId) => {
        delete this.cache[scriptId];
        delete this.scriptsPromises[scriptId];
      });

      await this.saveCache();
      await this.nativeScriptManager.invalidateScripts(scriptIds);

      this.emit('invalidated', ids);
      return ids;
    } catch (error) {
      const { code } = error as Error & { code: string };
      this.handleError(
        error,
        '[ScriptManager] Failed to invalidate scripts:',
        code ? `[${code}]` : ''
      );
    }
  }

  /**
   * Evaluates a script synchronously.
   *
   * This function sends the script source and its URL to the native script manager for evaluation.
   * It is functionally identical to `globalEvalWithSourceUrl`.
   *
   * @param scriptSource The source code of the script to evaluate.
   * @param scriptSourceUrl The URL of the script source, used for debugging purposes.
   */
  unstable_evaluateScript(scriptSource: string, scriptSourceUrl: string) {
    this.nativeScriptManager.unstable_evaluateScript(
      scriptSource,
      scriptSourceUrl
    );
  }
}
