import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NativeScriptManager from '../NativeScriptManager.js';
import { Script } from '../Script.js';
import { ScriptManager } from '../ScriptManager.js';

vi.mock('../NativeScriptManager.js', () => ({
  default: {
    loadScript: vi.fn(),
    prefetchScript: vi.fn(),
    invalidateScripts: vi.fn(),
  },
  NormalizedScriptLocatorHTTPMethod: {
    GET: 'GET',
    POST: 'POST',
  },
  NormalizedScriptLocatorSignatureVerificationMode: {
    STRICT: 'strict',
    LAX: 'lax',
    OFF: 'off',
  },
}));

const webpackRequire = () => [];

webpackRequire.i = [] as any[];
webpackRequire.l = () => {};
webpackRequire.u = (id: string) => `${id}.chunk.bundle`;
webpackRequire.p = () => '';
webpackRequire.repack = {
  shared: { scriptManager: undefined },
};

globalThis.__webpack_require__ = webpackRequire;

beforeEach(() => {
  ScriptManager.init();

  // mock the error handler to disable polluting the console
  // @ts-expect-error private method
  ScriptManager.shared.handleError = (error, message, ...args) => {
    ScriptManager.shared.emit('error', { message, args, originalError: error });
    throw error;
  };
});

afterEach(() => {
  globalThis.__webpack_require__.repack.shared.scriptManager = undefined;
});

describe('ScriptManager hooks', () => {
  it.each([
    ['beforeResolve', 'resolveScript'],
    ['afterResolve', 'resolveScript'],
    ['beforeLoad', 'loadScript'],
    ['afterLoad', 'loadScript'],
  ] as const)(
    'should sequentially call hook in series - %s',
    async (hookName, methodName) => {
      const executionOrder: string[] = [];
      ['first', 'second', 'third'].forEach((prefix) => {
        ScriptManager.shared.hooks[hookName](async (args) => {
          executionOrder.push(`${prefix}-${hookName}`);
          return args as any;
        });
      });

      ScriptManager.shared.addResolver(async (scriptId) => {
        return { url: Script.getRemoteURL(`http://domain.ext/${scriptId}`) };
      });

      await ScriptManager.shared[methodName]('test-script', 'test-caller');

      expect(executionOrder).toEqual([
        `first-${hookName}`,
        `second-${hookName}`,
        `third-${hookName}`,
      ]);
    }
  );

  it.each([
    ['beforeResolve', 'resolveScript'],
    ['afterResolve', 'resolveScript'],
    ['beforeLoad', 'loadScript'],
    ['afterLoad', 'loadScript'],
  ] as const)(
    'should pass args between hooks using waterfall pattern - %s',
    async (hookName, methodName) => {
      let testScriptId: string;
      let testCaller: string;

      ['first', 'second', 'third'].forEach((prefix) => {
        ScriptManager.shared.hooks[hookName](async (args) => {
          args.options.scriptId =
            testScriptId = `${prefix}-${args.options.scriptId}`;
          args.options.caller = testCaller = `${prefix}-${args.options.caller}`;

          return args as any;
        });
      });

      ScriptManager.shared.addResolver(async (scriptId) => {
        return { url: Script.getRemoteURL(`http://domain.ext/${scriptId}`) };
      });

      await ScriptManager.shared[methodName]('test-script', 'test-caller');

      expect(testScriptId!).toBe('third-second-first-test-script');
      expect(testCaller!).toBe('third-second-first-test-caller');
    }
  );

  describe('resolve hooks', () => {
    it('should call resolve hooks in correct lifecycle order', async () => {
      const hookOrder: string[] = [];

      ScriptManager.shared.hooks.beforeResolve(async (args) => {
        hookOrder.push('beforeResolve');
        return args;
      });

      ScriptManager.shared.hooks.resolve(async () => {
        hookOrder.push('resolve');
        return { url: 'http://domain.ext/test-script' };
      });

      ScriptManager.shared.hooks.afterResolve(async (args) => {
        hookOrder.push('afterResolve');
        return args;
      });

      ScriptManager.shared.addResolver(async (scriptId) => ({
        url: Script.getRemoteURL(`http://domain.ext/${scriptId}`),
      }));

      await ScriptManager.shared.resolveScript('test-script', 'main');
      expect(hookOrder).toEqual(['beforeResolve', 'resolve', 'afterResolve']);
    });

    it('should call error hook when resolution fails', async () => {
      const errorHookCallback = vi.fn();

      ScriptManager.shared.hooks.errorResolve(async ({ error, options }) => {
        errorHookCallback(options.scriptId, options.caller, error);
      });

      // No resolver added to trigger error
      await expect(
        ScriptManager.shared.resolveScript('test-script', 'test-caller')
      ).rejects.toThrow();

      expect(errorHookCallback).toHaveBeenCalledWith(
        'test-script',
        'test-caller',
        expect.any(Error)
      );
    });

    it('should allow obtaining locator from error hook as fallback', async () => {
      const errorHookCallback = vi.fn();
      ScriptManager.shared.hooks.errorResolve(async ({ error, options }) => {
        errorHookCallback(options.scriptId, options.caller, error);
        return { url: `http://domain.ext/${options.scriptId}.js` };
      });

      // No resolver added to trigger error
      await expect(
        ScriptManager.shared.resolveScript('test-script', 'test-caller')
      ).resolves.not.toThrow();

      expect(errorHookCallback).toHaveBeenCalledWith(
        'test-script',
        'test-caller',
        expect.any(Error)
      );
    });

    it('should allow beforeResolve hook to override options', async () => {
      ScriptManager.shared.hooks.beforeResolve(async ({ options }) => {
        return {
          options: {
            ...options,
            scriptId: 'custom-script',
            caller: 'custom-caller',
          },
        };
      });

      ScriptManager.shared.addResolver(async () => {
        return { url: Script.getRemoteURL('http://domain.ext/script') };
      });

      const script = await ScriptManager.shared.resolveScript(
        'original-script',
        'original-caller'
      );

      expect(script.scriptId).toBe('custom-script');
      expect(script.caller).toBe('custom-caller');
      expect(script.locator.url).toBe('http://domain.ext/script.chunk.bundle');
    });

    it('should allow afterResolve hook to override locator', async () => {
      ScriptManager.shared.hooks.afterResolve(async ({ options, locator }) => {
        return {
          options,
          locator: {
            ...locator,
            url: 'https://overriden-locator-url.com/script.js',
          },
        };
      });

      ScriptManager.shared.addResolver(async () => {
        return {
          cache: true,
          url: Script.getRemoteURL('http://domain.ext/script'),
        };
      });

      const script = await ScriptManager.shared.resolveScript(
        'original-script',
        'original-caller'
      );

      expect(script.scriptId).toBe('original-script');
      expect(script.caller).toBe('original-caller');
      expect(script.cache).toBe(true);
      expect(script.locator.url).toBe(
        'https://overriden-locator-url.com/script.js'
      );
    });

    it('should allow resolve hook to handle resolution with custom logic', async () => {
      // Add a resolver that should be ignored
      ScriptManager.shared.addResolver(async () => {
        return {
          url: Script.getRemoteURL('http://domain.ext/script.js'),
          cache: true,
        };
      });

      // Add custom resolution logic through the resolve hook
      ScriptManager.shared.hooks.resolve(async (args) => {
        return { url: `https://custom-url.com/${args.options.scriptId}` };
      });

      const script = await ScriptManager.shared.resolveScript(
        'custom-script',
        'custom-caller'
      );

      expect(script.scriptId).toBe('custom-script');
      expect(script.caller).toBe('custom-caller');
      expect(script.cache).toBe(true);
      expect(script.locator.url).toBe('https://custom-url.com/custom-script');
    });

    it('should use the first valid locator from multiple resolve hooks', async () => {
      // Add a noop resolver that will be ignored anyways
      ScriptManager.shared.addResolver(async () => {
        return undefined;
      });

      // Noop resolve hook - will be ignored
      ScriptManager.shared.hooks.resolve(async () => {
        return undefined;
      });

      // Valid resolve hook - should be used
      ScriptManager.shared.hooks.resolve(async (args) => {
        return { url: `https://valid-url.com/${args.options.scriptId}` };
      });

      // Valid resolve hook - will be ignored because previous hook is valid
      ScriptManager.shared.hooks.resolve(async (args) => {
        return { url: `https://invalid-url.com/${args.options.scriptId}` };
      });

      const script = await ScriptManager.shared.resolveScript(
        'custom-script',
        'custom-caller'
      );

      expect(script.locator.url).toBe('https://valid-url.com/custom-script');
    });
  });

  describe('load hooks', () => {
    it('should call load hooks in correct lifecycle order', async () => {
      const executionOrder: string[] = [];

      ScriptManager.shared.addResolver(async (scriptId) => {
        return { url: Script.getRemoteURL(`https://domain.ext/${scriptId}`) };
      });

      ScriptManager.shared.hooks.beforeLoad(async (args) => {
        executionOrder.push('beforeLoad');
        return args;
      });

      ScriptManager.shared.hooks.load(async ({ loadScript }) => {
        executionOrder.push('load');
        await loadScript();
        return true;
      });

      ScriptManager.shared.hooks.afterLoad(async (args) => {
        executionOrder.push('afterLoad');
        return args;
      });

      await ScriptManager.shared.loadScript('test-script');
      expect(executionOrder).toEqual(['beforeLoad', 'load', 'afterLoad']);
    });

    it('should call error hook when loading fails', async () => {
      const errorHookCallback = vi.fn();

      // prevent no resolvers error
      ScriptManager.shared.addResolver(async () => {
        return { url: 'https://domain.ext/test-script' };
      });

      // emulate loading error through custom load logic
      ScriptManager.shared.hooks.load(async () => {
        throw new Error('Load failed');
      });

      ScriptManager.shared.hooks.errorLoad(async ({ error, options }) => {
        errorHookCallback(options.scriptId, options.caller, error);
        return false;
      });

      await expect(
        ScriptManager.shared.loadScript('test-script')
      ).rejects.toThrow();

      expect(errorHookCallback).toHaveBeenCalledWith(
        'test-script',
        undefined,
        expect.any(Error)
      );
    });

    it('should allow flagging script as loaded from error hook', async () => {
      // prevent no resolvers error
      ScriptManager.shared.addResolver(async () => {
        return { url: 'https://domain.ext/test-script' };
      });

      // emulate loading error through custom load logic
      ScriptManager.shared.hooks.load(async () => {
        throw new Error('Load failed');
      });

      // mark the script as loaded despite the error
      ScriptManager.shared.hooks.errorLoad(async () => {
        return true;
      });

      await expect(
        ScriptManager.shared.loadScript('test-script')
      ).resolves.not.toThrow();
    });

    it('should allow beforeLoad hook to override script', async () => {
      const spy = vi.spyOn(NativeScriptManager, 'loadScript');

      ScriptManager.shared.hooks.beforeLoad(async ({ script, options }) => {
        script.locator.url = 'http://domain.ext/custom-script.js';

        return {
          script,
          options: {
            ...options,
            scriptId: 'custom-script',
            caller: 'custom-caller',
          },
        };
      });

      ScriptManager.shared.addResolver(async () => {
        return { url: Script.getRemoteURL('http://domain.ext/script') };
      });

      await ScriptManager.shared.loadScript(
        'original-script',
        'original-caller'
      );

      expect(spy).toHaveBeenCalledWith(
        'custom-script',
        expect.objectContaining({ url: 'http://domain.ext/custom-script.js' })
      );
    });

    it('should allow load hook to handle loading with custom logic', async () => {
      const spy = vi.spyOn(NativeScriptManager, 'loadScript');

      ScriptManager.shared.addResolver(async () => {
        return {
          url: Script.getRemoteURL('http://domain.ext/script.js'),
          retry: 3,
          retryDelay: 100,
        };
      });

      spy.mockRejectedValue({
        code: 'NetworkFailure',
        message: 'mocked network failure',
      });

      await expect(
        ScriptManager.shared.loadScript('custom-script')
      ).rejects.toThrow();

      // 1 + 3 retries
      expect(spy).toHaveBeenCalledTimes(4);

      spy.mockClear();

      ScriptManager.shared.hooks.load(async ({ script, loadScript }) => {
        await loadScript(script.scriptId, {
          ...script.locator,
          retry: 0,
          retryDelay: 0,
        });
        return true;
      });

      await expect(
        ScriptManager.shared.loadScript('custom-script')
      ).rejects.toThrow();

      // no retries
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
