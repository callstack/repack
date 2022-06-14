/* globals __DEV__, __webpack_require__ */
import EventEmitter from 'events';
import { NativeModules } from 'react-native';
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

export class ScriptManagerAPI extends EventEmitter {
  constructor(private nativeModule: any) {
    super();
  }

  private cache?: Cache;
  private resolve?: ScriptLocatorResolver;
  private storage?: StorageApi;

  configure(config: ScriptManagerConfig) {
    this.storage = config.storage;
    this.resolve = config.resolve;

    __webpack_require__.repack.loadScriptCallback.push = ((
      parentPush: typeof Array.prototype.push,
      ...data: string[]
    ) => {
      this.emit('_loaded', data[0]);
      return parentPush(...data);
    }).bind(
      null,
      __webpack_require__.repack.loadScriptCallback.push.bind(
        __webpack_require__.repack.loadScriptCallback
      )
    );

    __webpack_require__.repack.scriptManager = this;
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

  async resolveScript(scriptId: string, caller?: string): Promise<Script> {
    await this.initCache();
    try {
      if (!this.resolve) {
        throw new Error(
          'No script resolver was provided. Did you forget to add `ScriptManager.configure({ resolve: ... })`?'
        );
      }

      this.emit('resolving', { scriptId, caller });
      const locator = await this.resolve(scriptId, caller);
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

  async loadScript(scriptId: string, caller?: string) {
    let script = await this.resolveScript(scriptId, caller);

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
          await this.nativeModule.loadScript(scriptId, script.locator);
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

  async preloadScript(scriptId: string, caller?: string) {
    let script = await this.resolveScript(scriptId, caller);

    try {
      this.emit('preloading', script.locator);
      await this.nativeModule.preloadScript(scriptId, script.locator);
    } catch (error) {
      const { code } = error as Error & { code: string };
      this.handleError(
        error,
        '[ScriptManager] Failed to preload script:',
        code ? `[${code}]` : '',
        script.locator
      );
    }
  }

  async invalidateScripts(scriptIds: string[] = []) {
    try {
      await this.initCache();
      const ids = scriptIds ?? Object.keys(this.cache ?? {});

      for (const scriptId of ids) {
        delete this.cache?.[scriptId];
      }
      await this.saveCache();

      await this.nativeModule.invalidateScripts(ids);
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

export const ScriptManager = new ScriptManagerAPI(NativeModules.ScriptManager);
