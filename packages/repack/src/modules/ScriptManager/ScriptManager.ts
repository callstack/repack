/* globals __DEV__, __webpack_require__ */
import EventEmitter from 'events';
import { NativeModules } from 'react-native';
import { getWebpackContext } from './getWebpackContext';
import { Script } from './Script';
import type {
  NormalizedScriptLocator,
  ScriptLocatorResolver,
  ScriptManagerConfig,
  StorageApi,
} from './types';

type Cache = Record<
  string,
  Pick<NormalizedScriptLocator, 'method' | 'url' | 'query' | 'headers' | 'body'>
>;

const CACHE_KEY = `Repack.ScriptManager.Cache.v3.${
  __DEV__ ? 'debug' : 'release'
}`;

/**
 * A manager to ease resolution, downloading and executing additional code from:
 * - arbitrary JavaScript scripts
 * - Webpack chunks
 * - Webpack bundles
 * - Webpack MF containers
 *
 * An instance of `ScriptManagerAPI` class is exported under `ScriptManager` constant.
 *
 * __You should always use `ScriptManager` constant instead of constructing `new ScriptManagerAPI(...)` yourself!__
 *
 * This API is mainly useful, if you are working with any form of Code Splitting.
 *
 * `ScriptManager` is also an `EventEmitter` and emits the following events:
 * - `resolving` with `{ scriptId, caller }`
 * - `resolved` with `scriptLocator: NormalizedScriptLocator`
 * - `prefetching` with `scriptLocator: NormalizedScriptLocator`
 * - `loading` with `scriptLocator: NormalizedScriptLocator`
 * - `loaded` with `scriptLocator: NormalizedScriptLocator`
 * - `error` with `error: Error`
 *
 * Example of using this API with async Webpack chunk:
 * ```js
 * import * as React from 'react';
 * import { ScriptManager, Script } from '@callstack/repack/client';
 *
 * new ScriptManager({
 *   resolve: async (scriptId) => {
 *     if (__DEV__) {
 *       return {
 *         url: Script.getDevServerURL(scriptId);
 *         cache: false,
 *       };
 *     }
 *
 *     return {
 *       url: Script.getRemoteURL(`http://domain.exaple/apps/${scriptId}`),
 *     };
 *   },
 * });
 *
 * // ScriptManager.loadScript is called internally when running `import()`
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
    const { scriptManager } = __webpack_require__.repack.shared;
    if (!scriptManager) {
      throw new Error(
        'Shared ScriptManager instance is not available. Did you instigate it in host application using new ScriptManager(...)?'
      );
    }
    return scriptManager;
  }

  private cache?: Cache;
  private resolve?: ScriptLocatorResolver;
  private storage?: StorageApi;

  /**
   * Constructs instance of `ScriptManager`, configures it to be able to resolve
   * location of scripts and optionally, it also allows to set up caching to
   * avoid over-fetching.
   *
   * @param config Configuration options.
   */
  constructor(
    config: ScriptManagerConfig,
    private nativeScriptManager = NativeModules.ScriptManager
  ) {
    super();

    if (__webpack_require__.repack.shared.scriptManager) {
      throw new Error(
        'ScriptManager was already instantiated. Use ScriptManager.shared instead.'
      );
    }

    this.storage = config.storage;
    this.resolve = config.resolve;

    __webpack_require__.repack.shared.loadScriptCallback.push = ((
      parentPush: typeof Array.prototype.push,
      ...data: string[]
    ) => {
      this.emit('_loaded', data[0]);
      return parentPush(...data);
    }).bind(
      null,
      __webpack_require__.repack.shared.loadScriptCallback.push.bind(
        __webpack_require__.repack.shared.loadScriptCallback
      )
    );

    __webpack_require__.repack.shared.scriptManager = this;
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

  private handleError(error: any, message: string, ...args: any[]): never {
    console.error(message, (error as Error).message, ...args);
    this.emit('error', { message, args, originalError: error });
    throw error;
  }

  /**
   * Resolves a {@link Script} instance with normalized locator data.
   *
   * Use `ScriptManager.on('resolving', ({ scriptId, caller }) => { })` to listen for when
   * the script resolution begins.
   *
   * Use `ScriptManager.on('resolved', (scriptLocator) => { })` to listen for when
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
      if (!this.resolve) {
        throw new Error(
          'No script resolver was provided. Did you forget to add `ScriptManager.configure({ resolve: ... })`?'
        );
      }

      this.emit('resolving', { scriptId, caller });
      const locator = await this.resolve(scriptId, caller);

      if (typeof locator.url === 'function') {
        locator.url = locator.url(webpackContext);
      }

      const script = Script.from(locator, false);

      if (!this.cache?.[scriptId]) {
        script.locator.fetch = true;
        this.cache = this.cache ?? {};
        this.cache[scriptId] = script.getCacheData();
        await this.saveCache();
      } else if (script.shouldRefetch(this.cache[scriptId])) {
        script.locator.fetch = true;
        this.cache[scriptId] = script.getCacheData();
        await this.saveCache();
      }

      this.emit('resolved', script.locator);

      return script;
    } catch (error) {
      this.handleError(
        error,
        '[ScriptManager] Failed while resolving script locator:'
      );
    }
  }

  /**
   * Resolves given script's location, downloads and executes it.
   * The execution of the code is handled internally by threading in React Native.
   *
   * Use `ScriptManager.on('loading', (scriptLocator) => { })` to listen for when
   * the script is about to be loaded.
   *
   * Use `ScriptManager.on('loaded', (scriptLocator) => { })` to listen for when
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
        const onLoaded = (data: string) => {
          if (data === scriptId) {
            this.emit('loaded', script.locator);
            resolve();
          }
        };

        try {
          this.emit('loading', script.locator);
          this.on('_loaded', onLoaded);
          await this.nativeScriptManager.loadScript(scriptId, script.locator);
        } catch (error) {
          const { code } = error as Error & { code: string };
          this.handleError(
            error,
            '[ScriptManager] Failed to load script:',
            code ? `[${code}]` : '',
            script.locator
          );
        } finally {
          this.removeListener('_loaded', onLoaded);
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
   * Use `ScriptManager.on('prefetching', (scriptLocator) => { })` to listen for when
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
      this.emit('prefetching', script.locator);
      await this.nativeScriptManager.prefetchScript(scriptId, script.locator);
    } catch (error) {
      const { code } = error as Error & { code: string };
      this.handleError(
        error,
        '[ScriptManager] Failed to prefetch script:',
        code ? `[${code}]` : '',
        script.locator
      );
    }
  }

  /**
   * Clears the cache (if configured in {@link ScriptManager.configure}) and removes downloaded
   * files for given scripts from the filesystem. This function can be awaited to detect if the
   * scripts were invalidated and for error handling.
   *
   * Use `ScriptManager.on('invalidated', (scriptIds) => { })` to listen for when
   * the invalidation completes.
   *
   * @param scriptIds Array of script ids to clear from cache and remove from filesystem.
   */
  async invalidateScripts(scriptIds: string[] = []) {
    try {
      await this.initCache();
      const ids = scriptIds ?? Object.keys(this.cache ?? {});

      for (const scriptId of ids) {
        delete this.cache?.[scriptId];
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
