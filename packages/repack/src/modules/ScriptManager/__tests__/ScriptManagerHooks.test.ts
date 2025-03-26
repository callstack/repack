import NativeScriptManager, {
  type NormalizedScriptLocator,
} from '../NativeScriptManager.js';
import { Script } from '../Script.js';
import { ScriptManager } from '../ScriptManager.js';
import { getWebpackContext } from '../getWebpackContext.js';

jest.mock('../NativeScriptManager.js', () => ({
  loadScript: jest.fn(),
  prefetchScript: jest.fn(),
  invalidateScripts: jest.fn(),
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
  it('should call hooks in correct lifecycle order', async () => {
    const hookOrder: string[] = [];

    ScriptManager.shared.hooks.beforeResolve((_, callback) => {
      console.log('beforeResolve', hookOrder);
      hookOrder.push('beforeResolve');
      callback(null);
    });

    ScriptManager.shared.hooks.resolve(({ webpackContext }, callback) => {
      hookOrder.push('resolve');
      callback(null, {
        scriptId: 'test-script',
        caller: 'main',
        result: {
          url: 'http://domain.ext/test-script',
        },
        resolvers: [],
        webpackContext,
      });
    });

    ScriptManager.shared.hooks.afterResolve((_, callback) => {
      hookOrder.push('afterResolve');
      callback(null);
    });

    ScriptManager.shared.addResolver(async (scriptId) => ({
      url: Script.getRemoteURL(`http://domain.ext/${scriptId}`),
    }));

    await ScriptManager.shared.resolveScript('test-script', 'main');

    expect(hookOrder).toEqual(['beforeResolve', 'resolve', 'afterResolve']);
  });

  it('should call error hook when resolution fails', async () => {
    const errorHookCalled = jest.fn();

    ScriptManager.shared.hooks.errorResolve(
      ({ scriptId, caller, error }, callback) => {
        expect(error).toBeDefined();
        errorHookCalled(scriptId, caller, error);
        callback();
      }
    );

    // No resolver added to trigger error
    await expect(
      ScriptManager.shared.resolveScript('test-script', 'test-caller')
    ).rejects.toThrow();

    expect(errorHookCalled).toHaveBeenCalledWith(
      'test-script',
      'test-caller',
      expect.any(Error)
    );
  });

  it('should allow multiple hooks to be registered in series', async () => {
    const executionOrder: string[] = [];

    ['first', 'second'].forEach((prefix) => {
      ScriptManager.shared.hooks.beforeResolve((_, callback) => {
        executionOrder.push(`${prefix}-beforeResolve`);
        callback(null);
      });

      ScriptManager.shared.hooks.afterResolve((_, callback) => {
        executionOrder.push(`${prefix}-afterResolve`);
        callback(null);
      });
    });

    ScriptManager.shared.addResolver(async (scriptId) => {
      executionOrder.push('resolver');
      return {
        url: Script.getRemoteURL(`http://domain.ext/${scriptId}`),
      };
    });

    await ScriptManager.shared.resolveScript('test-script', 'test-caller');

    expect(executionOrder).toEqual([
      'first-beforeResolve',
      'second-beforeResolve',
      'resolver',
      'first-afterResolve',
      'second-afterResolve',
    ]);
  });

  describe('hooks lifecycle', () => {
    it('should call hooks in correct order during successful resolution', async () => {
      const hookOrder: string[] = [];

      ScriptManager.shared.hooks.beforeResolve((_, callback) => {
        hookOrder.push('beforeResolve');
        callback(null);
      });

      ScriptManager.shared.hooks.resolve(({ webpackContext }, callback) => {
        hookOrder.push('resolve');
        callback(null, {
          scriptId: 'test-script',
          caller: 'main',
          result: {
            url: 'http://domain.ext/test-script',
          },
          resolvers: [],
          webpackContext,
        });
      });

      ScriptManager.shared.hooks.afterResolve((_, callback) => {
        hookOrder.push('afterResolve');
        callback(null);
      });

      ScriptManager.shared.addResolver(async (scriptId) => {
        return {
          url: Script.getRemoteURL(`http://domain.ext/${scriptId}`),
        };
      });

      await ScriptManager.shared.resolveScript('test-script', 'main');

      expect(hookOrder).toEqual(['beforeResolve', 'resolve', 'afterResolve']);
    });

    it('should call error hook when resolution fails', async () => {
      const errorHookCalled = jest.fn();

      ScriptManager.shared.hooks.errorResolve(
        ({ scriptId, caller, error }, callback) => {
          expect(error).toBeDefined();
          errorHookCalled(scriptId, caller, error);
          callback();
        }
      );

      // No resolver added to trigger error
      await expect(
        ScriptManager.shared.resolveScript('test-script', 'test-caller')
      ).rejects.toThrow();

      expect(errorHookCalled).toHaveBeenCalledWith(
        'test-script',
        'test-caller',
        expect.any(Error)
      );
    });

    it('should allow multiple hooks to be registered in series', async () => {
      const executionOrder: string[] = [];

      ['first', 'second'].forEach((prefix) => {
        ScriptManager.shared.hooks.beforeResolve(
          ({ webpackContext }, callback) => {
            executionOrder.push(`${prefix}-beforeResolve`);
            callback(null, {
              scriptId: 'test-script',
              caller: 'test-caller',
              webpackContext,
            });
          }
        );

        ScriptManager.shared.hooks.afterResolve((_, callback) => {
          executionOrder.push(`${prefix}-afterResolve`);
          callback(null);
        });
      });

      ScriptManager.shared.addResolver(async (scriptId) => {
        executionOrder.push('resolver');
        return {
          url: Script.getRemoteURL(`http://domain.ext/${scriptId}`),
        };
      });

      await ScriptManager.shared.resolveScript('test-script', 'test-caller');

      expect(executionOrder).toEqual([
        'first-beforeResolve',
        'second-beforeResolve',
        'resolver',
        'first-afterResolve',
        'second-afterResolve',
      ]);
    });

    it('should allow beforeResolve hook to override parameters', async () => {
      const hookOrder: string[] = [];
      const originalScriptId = 'original-script';
      const overriddenScriptId = 'overridden-script';
      const originalCaller = 'original-caller';
      const overriddenCaller = 'overridden-caller';

      ScriptManager.shared.addResolver(async (scriptId, caller) => {
        expect(scriptId).toBe(overriddenScriptId);
        expect(caller).toBe(overriddenCaller);
        return {
          url: Script.getRemoteURL(`http://domain.ext/${scriptId}`),
        };
      });

      ScriptManager.shared.hooks.beforeResolve(
        ({ scriptId, caller, webpackContext }, callback) => {
          expect(scriptId).toBe(originalScriptId);
          expect(caller).toBe(originalCaller);
          hookOrder.push('beforeResolve');
          callback(null, {
            scriptId: overriddenScriptId,
            caller: overriddenCaller,
            webpackContext,
          });
        }
      );

      ScriptManager.shared.hooks.resolve(
        ({ scriptId, caller, webpackContext }, callback) => {
          expect(scriptId).toBe(overriddenScriptId);
          expect(caller).toBe(overriddenCaller);
          hookOrder.push('resolve');
          callback(null, {
            scriptId: 'test-script',
            caller: 'main',
            result: {
              url: 'http://domain.ext/test-script',
            },
            resolvers: [],
            webpackContext,
          });
        }
      );

      ScriptManager.shared.hooks.afterResolve(
        ({ scriptId, caller }, callback) => {
          expect(scriptId).toBe(overriddenScriptId);
          expect(caller).toBe(overriddenCaller);
          hookOrder.push('afterResolve');
          callback(null);
        }
      );

      const script = await ScriptManager.shared.resolveScript(
        originalScriptId,
        originalCaller
      );
      expect(script.locator.uniqueId).toBe(
        `${overriddenCaller}_${overriddenScriptId}`
      );
      expect(hookOrder).toEqual(['beforeResolve', 'resolve', 'afterResolve']);

      ScriptManager.shared.removeAllResolvers();
    });

    it('should call hooks in correct lifecycle order', async () => {
      const hookOrder: string[] = [];

      ScriptManager.shared.addResolver(async (scriptId) => {
        return {
          url: Script.getRemoteURL(`http://domain.ext/${scriptId}`),
        };
      });

      ScriptManager.shared.hooks.beforeResolve(
        ({ scriptId, caller, webpackContext }, callback) => {
          hookOrder.push('beforeResolve');
          callback(null, { scriptId, caller, webpackContext });
        }
      );

      ScriptManager.shared.hooks.resolve(({ webpackContext }, callback) => {
        hookOrder.push('resolve');
        callback(null, {
          scriptId: 'test-script',
          caller: 'main',
          result: {
            url: 'http://domain.ext/test-script',
          },
          resolvers: [],
          webpackContext,
        });
      });

      ScriptManager.shared.hooks.afterResolve((_, callback) => {
        hookOrder.push('afterResolve');
        callback(null);
      });

      await ScriptManager.shared.resolveScript('test-script', 'main');

      expect(hookOrder).toEqual(['beforeResolve', 'resolve', 'afterResolve']);

      ScriptManager.shared.removeAllResolvers();
    });

    it('should call error hook when resolution fails', async () => {
      const errorHookCalled = jest.fn();

      ScriptManager.shared.hooks.errorResolve(
        ({ scriptId, caller, error }, callback) => {
          expect(error).toBeDefined();
          errorHookCalled(scriptId, caller, error);
          callback();
        }
      );

      // No resolver added to trigger error
      await expect(
        ScriptManager.shared.resolveScript('test-script', 'test-caller')
      ).rejects.toThrow();

      expect(errorHookCalled).toHaveBeenCalledWith(
        'test-script',
        'test-caller',
        expect.any(Error)
      );
    });

    it('should allow resolve hook to handle resolution with custom logic', async () => {
      const hookOrder: string[] = [];
      const customScriptId = 'custom-script';
      const customCaller = 'custom-caller';
      const customReferenceUrl = 'http://reference.url';

      ScriptManager.shared.hooks.beforeResolve(
        ({ scriptId, caller, webpackContext }, callback) => {
          hookOrder.push('beforeResolve');
          callback(null, {
            scriptId,
            caller,
            webpackContext,
            referenceUrl: customReferenceUrl,
          });
        }
      );

      ScriptManager.shared.hooks.resolve(async (params, callback) => {
        const { scriptId, caller, referenceUrl, resolvers } = params;

        expect(scriptId).toBe(customScriptId);
        expect(caller).toBe(customCaller);
        expect(referenceUrl).toBe(customReferenceUrl);
        expect(resolvers).toBeDefined();
        expect(Array.isArray(resolvers)).toBe(true);

        hookOrder.push('resolve');
        for (const [, , resolve] of params.resolvers) {
          try {
            const resolvedLocator = await resolve(
              params.scriptId,
              params.caller,
              params.referenceUrl
            );

            if (resolvedLocator) {
              callback(null, {
                ...params,
                result: resolvedLocator,
              });
              return;
            }
          } catch (error) {
            if (error instanceof Error) {
              callback(error);
            } else {
              callback(new Error('Unknown error occurred'));
            }
            return;
          }
        }
        callback(new Error('No locator found'));
      });

      ScriptManager.shared.hooks.afterResolve(
        ({ scriptId, caller }, callback) => {
          expect(scriptId).toBe(customScriptId);
          expect(caller).toBe(customCaller);
          hookOrder.push('afterResolve');
          callback(null);
        }
      );

      // Add a resolver that should be called by the hook
      ScriptManager.shared.addResolver(async () => {
        hookOrder.push('resolver');
        return {
          url: Script.getRemoteURL('http://domain.ext/script.js'),
          cache: true,
        };
      });

      const script = await ScriptManager.shared.resolveScript(
        customScriptId,
        customCaller,
        getWebpackContext(),
        customReferenceUrl
      );
      expect(script.locator.url).toBe(
        'http://domain.ext/script.js.chunk.bundle'
      );
      expect(hookOrder).toEqual([
        'beforeResolve',
        'resolve',
        'resolver',
        'afterResolve',
      ]);

      ScriptManager.shared.removeAllResolvers();
    });
  });

  describe('loading script hooks lifecycle', () => {
    it('should call hooks in correct order during successful loading', async () => {
      mockLoadScriptBasedOnFetch();

      const executionOrder: string[] = [];

      ScriptManager.shared.addResolver(async (scriptId) => {
        return {
          url: Script.getRemoteURL(`https://domain.ext/${scriptId}`),
        };
      });

      ScriptManager.shared.hooks.beforeLoad(async (_, callback) => {
        executionOrder.push('beforeLoad');
        callback(null);
      });

      ScriptManager.shared.hooks.afterLoad(async (_, callback) => {
        executionOrder.push('afterLoad');
        callback(null);
      });

      await ScriptManager.shared.loadScript('test-script');

      expect(executionOrder).toEqual(['beforeLoad', 'afterLoad']);

      ScriptManager.shared.removeAllResolvers();
    });

    it('should call error hook when loading fails', async () => {
      const loadScriptSpy = jest.spyOn(NativeScriptManager, 'loadScript');
      mockLoadScriptBasedOnFetch(loadScriptSpy);

      const executionOrder: string[] = [];
      ScriptManager.shared.addResolver(async () => {
        return {
          url: Script.getRemoteURL('https://domain.ext/test-script'),
        };
      });

      ScriptManager.shared.hooks.beforeLoad(async (_, callback) => {
        executionOrder.push('beforeLoad');
        callback(null);
      });

      ScriptManager.shared.hooks.afterLoad(async (_, callback) => {
        executionOrder.push('afterLoad');
        callback(null);
      });

      ScriptManager.shared.hooks.errorLoad(async ({ error }, callback) => {
        executionOrder.push('errorLoad');
        callback(error);
      });

      loadScriptSpy.mockRejectedValueOnce(new Error('Load failed'));

      await expect(
        ScriptManager.shared.loadScript('test-script')
      ).rejects.toThrow('Load failed');
      expect(executionOrder).toEqual(['beforeLoad', 'errorLoad']);

      loadScriptSpy.mockRestore();
      ScriptManager.shared.removeAllResolvers();
    });

    it('should call multiple hooks in correct order', async () => {
      mockLoadScriptBasedOnFetch();

      const executionOrder: string[] = [];

      ScriptManager.shared.addResolver(async () => {
        return {
          url: Script.getRemoteURL('https://domain.ext/test-script'),
        };
      });

      ScriptManager.shared.hooks.beforeLoad(async (_, callback) => {
        executionOrder.push('first-beforeLoad');
        callback(null);
      });

      ScriptManager.shared.hooks.beforeLoad(async (_, callback) => {
        executionOrder.push('second-beforeLoad');
        callback(null);
      });

      ScriptManager.shared.hooks.afterLoad(async (_, callback) => {
        executionOrder.push('first-afterLoad');
        callback(null);
      });

      ScriptManager.shared.hooks.afterLoad(async (_, callback) => {
        executionOrder.push('second-afterLoad');
        callback(null);
      });

      await ScriptManager.shared.loadScript('test-script');

      expect(executionOrder).toEqual([
        'first-beforeLoad',
        'second-beforeLoad',
        'first-afterLoad',
        'second-afterLoad',
      ]);

      ScriptManager.shared.removeAllResolvers();
    });

    it('should allow load hook to handle loading with custom logic', async () => {
      const hookOrder: string[] = [];
      const customScriptId = 'custom-script';
      const customCaller = 'custom-caller';

      ScriptManager.shared.addResolver(async () => {
        return {
          url: Script.getRemoteURL('https://domain.ext/test-script'),
        };
      });

      ScriptManager.shared.hooks.beforeLoad(
        async ({ scriptId, caller }, callback) => {
          expect(scriptId).toBe(customScriptId);
          expect(caller).toBe(customCaller);
          hookOrder.push('beforeLoad');
          callback(null);
        }
      );

      ScriptManager.shared.hooks.load(async (params, callback) => {
        expect(params.scriptId).toBe(customScriptId);
        expect(params.caller).toBe(customCaller);
        expect(params.locator).toBeDefined();
        hookOrder.push('load');

        try {
          await NativeScriptManager.loadScript(params.scriptId, params.locator);
          callback(null);
        } catch (error) {
          if (error instanceof Error) {
            callback(error);
          } else {
            callback(new Error('Unknown error occurred'));
          }
        }
      });

      ScriptManager.shared.hooks.afterLoad(({ scriptId, caller }, callback) => {
        expect(scriptId).toBe(customScriptId);
        expect(caller).toBe(customCaller);
        hookOrder.push('afterLoad');
        callback(null);
      });

      await ScriptManager.shared.loadScript(customScriptId, customCaller);
      expect(hookOrder).toEqual(['beforeLoad', 'load', 'afterLoad']);

      ScriptManager.shared.removeAllResolvers();
    });

    it('should handle load hook errors correctly', async () => {
      const hookOrder: string[] = [];
      const customScriptId = 'custom-script';
      const customCaller = 'custom-caller';
      const expectedError = new Error('Custom load error');

      ScriptManager.shared.addResolver(async () => {
        return {
          url: Script.getRemoteURL('https://domain.ext/test-script'),
        };
      });

      ScriptManager.shared.hooks.beforeLoad(async (_, callback) => {
        hookOrder.push('beforeLoad');
        callback(null);
      });

      ScriptManager.shared.hooks.load(async (_, callback) => {
        hookOrder.push('load');
        callback(expectedError);
      });

      ScriptManager.shared.hooks.errorLoad(async ({ error }, callback) => {
        expect(error).toBeDefined();
        expect(error).toBe(expectedError);
        hookOrder.push('errorLoad');
        callback();
      });

      const error = await ScriptManager.shared
        .loadScript(customScriptId, customCaller)
        .catch((e) => e);
      expect(error).toMatchObject({
        code: 'ERR_UNHANDLED_ERROR',
        context: {
          message: '[ScriptManager] Failed to load script:',
          originalError: expectedError,
        },
      });

      expect(hookOrder).toEqual(['beforeLoad', 'load', 'errorLoad']);

      ScriptManager.shared.removeAllResolvers();
    });

    it('should handle multiple load hooks in sequence', async () => {
      const hookOrder: string[] = [];
      const customScriptId = 'custom-script';

      ScriptManager.shared.addResolver(async () => {
        return {
          url: Script.getRemoteURL('https://domain.ext/test-script'),
        };
      });

      ['first', 'second'].forEach((prefix) => {
        ScriptManager.shared.hooks.beforeLoad(async (_, callback) => {
          hookOrder.push(`${prefix}-beforeLoad`);
          callback(null);
        });

        ScriptManager.shared.hooks.load(async (params, callback) => {
          hookOrder.push(`${prefix}-load`);
          if (prefix === 'second') {
            await NativeScriptManager.loadScript(
              params.scriptId,
              params.locator
            );
          }
          callback(null);
        });

        ScriptManager.shared.hooks.afterLoad(async (_, callback) => {
          hookOrder.push(`${prefix}-afterLoad`);
          callback(null);
        });
      });

      await ScriptManager.shared.loadScript(customScriptId);
      expect(hookOrder).toEqual([
        'first-beforeLoad',
        'second-beforeLoad',
        'first-load',
        'second-load',
        'first-afterLoad',
        'second-afterLoad',
      ]);

      ScriptManager.shared.removeAllResolvers();
    });
  });
});

function mockLoadScriptBasedOnFetch(
  providedSpy?: jest.SpyInstance<
    Promise<null>,
    [string, NormalizedScriptLocator]
  >
) {
  jest.useFakeTimers({ advanceTimers: true });
  const spy = providedSpy ?? jest.spyOn(NativeScriptManager, 'loadScript');

  spy.mockImplementation(
    (_scriptId: string, scriptConfig: NormalizedScriptLocator) =>
      scriptConfig.fetch
        ? new Promise<null>((resolve) => {
            setTimeout(() => resolve(null), 10);
          })
        : Promise.resolve(null)
  );

  return spy;
}
