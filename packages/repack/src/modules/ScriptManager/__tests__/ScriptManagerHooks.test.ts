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

interface ScriptHookParams {
  scriptId: string;
  caller?: string;
  error?: Error;
}

describe('ScriptManager hooks', () => {
  it('should call hooks in correct lifecycle order', async () => {
    const hookOrder: string[] = [];

    ScriptManager.shared.hooks.beforeResolve.tap(
      'test-before',
      ({ scriptId, caller, webpackContext }) => {
        hookOrder.push('beforeResolve');
        return { scriptId, caller, webpackContext };
      }
    );

    ScriptManager.shared.hooks.resolve.tapAsync(
      'test-during',
      ({ webpackContext }, callback) => {
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

    ScriptManager.shared.hooks.afterResolve.tap('test-after', () => {
      hookOrder.push('afterResolve');
    });

    ScriptManager.shared.addResolver(async (scriptId) => ({
      url: Script.getRemoteURL(`http://domain.ext/${scriptId}`),
    }));

    await ScriptManager.shared.resolveScript('test-script', 'main');

    expect(hookOrder).toEqual(['beforeResolve', 'resolve', 'afterResolve']);
  });

  it('should call error hook when resolution fails', async () => {
    const errorHookCalled = jest.fn();

    ScriptManager.shared.hooks.errorResolve.tap(
      'test-error',
      ({ scriptId, caller, error }: ScriptHookParams) => {
        expect(error).toBeDefined();
        errorHookCalled(scriptId, caller, error);
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
      ScriptManager.shared.hooks.beforeResolve.tap(
        `${prefix}-before`,
        ({ scriptId, caller, webpackContext }) => {
          executionOrder.push(`${prefix}-beforeResolve`);
          return { scriptId, caller, webpackContext };
        }
      );

      ScriptManager.shared.hooks.afterResolve.tap(`${prefix}-after`, () => {
        executionOrder.push(`${prefix}-afterResolve`);
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

      ScriptManager.shared.hooks.beforeResolve.tap(
        'test-before',
        ({ scriptId, caller, webpackContext }) => {
          hookOrder.push('beforeResolve');
          return { scriptId, caller, webpackContext };
        }
      );

      ScriptManager.shared.hooks.resolve.tapAsync(
        'test-during',
        ({ webpackContext }, callback) => {
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

      ScriptManager.shared.hooks.afterResolve.tap('test-after', () => {
        hookOrder.push('afterResolve');
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

      ScriptManager.shared.hooks.errorResolve.tap(
        'test-error',
        ({ scriptId, caller, error }: ScriptHookParams) => {
          expect(error).toBeDefined();
          errorHookCalled(scriptId, caller, error);
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
        ScriptManager.shared.hooks.beforeResolve.tap(
          `${prefix}-before`,
          ({ webpackContext }) => {
            executionOrder.push(`${prefix}-beforeResolve`);
            return {
              scriptId: 'test-script',
              caller: 'test-caller',
              webpackContext,
            };
          }
        );

        ScriptManager.shared.hooks.afterResolve.tap(`${prefix}-after`, () => {
          executionOrder.push(`${prefix}-afterResolve`);
          return {
            scriptId: 'test-script',
            caller: 'test-caller',
          };
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

      ScriptManager.shared.hooks.beforeResolve.tap(
        'test-before',
        ({ scriptId, caller, webpackContext }) => {
          expect(scriptId).toBe(originalScriptId);
          expect(caller).toBe(originalCaller);
          hookOrder.push('beforeResolve');
          return {
            scriptId: overriddenScriptId,
            caller: overriddenCaller,
            webpackContext,
          };
        }
      );

      ScriptManager.shared.hooks.resolve.tapAsync(
        'test-during',
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

      ScriptManager.shared.hooks.afterResolve.tap(
        'test-after',
        ({ scriptId, caller }) => {
          expect(scriptId).toBe(overriddenScriptId);
          expect(caller).toBe(overriddenCaller);
          hookOrder.push('afterResolve');
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

      ScriptManager.shared.hooks.beforeResolve.tap(
        'test-before',
        ({ scriptId, caller, webpackContext }) => {
          hookOrder.push('beforeResolve');
          return { scriptId, caller, webpackContext };
        }
      );

      ScriptManager.shared.hooks.resolve.tapAsync(
        'test-during',
        ({ webpackContext }, callback) => {
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

      ScriptManager.shared.hooks.afterResolve.tap('test-after', () => {
        hookOrder.push('afterResolve');
      });

      await ScriptManager.shared.resolveScript('test-script', 'main');

      expect(hookOrder).toEqual(['beforeResolve', 'resolve', 'afterResolve']);

      ScriptManager.shared.removeAllResolvers();
    });

    it('should call error hook when resolution fails', async () => {
      const errorHookCalled = jest.fn();

      ScriptManager.shared.hooks.errorResolve.tap(
        'test-error',
        ({ scriptId, caller, error }) => {
          expect(error).toBeDefined();
          errorHookCalled(scriptId, caller, error);
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

      ScriptManager.shared.hooks.beforeResolve.tap(
        'test-before',
        ({ scriptId, caller, webpackContext }) => {
          hookOrder.push('beforeResolve');
          return {
            scriptId,
            caller,
            webpackContext,
            referenceUrl: customReferenceUrl,
          };
        }
      );

      ScriptManager.shared.hooks.resolve.tapAsync(
        'test-resolve',
        async (params, callback) => {
          expect(params.scriptId).toBe(customScriptId);
          expect(params.caller).toBe(customCaller);
          expect(params.referenceUrl).toBe(customReferenceUrl);
          expect(params.resolvers).toBeDefined();
          expect(Array.isArray(params.resolvers)).toBe(true);

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
        }
      );

      ScriptManager.shared.hooks.afterResolve.tap(
        'test-after',
        ({ scriptId, caller }) => {
          expect(scriptId).toBe(customScriptId);
          expect(caller).toBe(customCaller);
          hookOrder.push('afterResolve');
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

      ScriptManager.shared.hooks.beforeLoad.tap('test-before', async () => {
        executionOrder.push('beforeLoad');
      });

      ScriptManager.shared.hooks.afterLoad.tap('test-after', async () => {
        executionOrder.push('afterLoad');
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

      ScriptManager.shared.hooks.beforeLoad.tap('test-before', async () => {
        executionOrder.push('beforeLoad');
      });

      ScriptManager.shared.hooks.afterLoad.tap('test-after', async () => {
        executionOrder.push('afterLoad');
      });

      ScriptManager.shared.hooks.errorLoad.tap('test-error', async () => {
        executionOrder.push('errorLoad');
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

      ScriptManager.shared.hooks.beforeLoad.tap('first-before', async () => {
        executionOrder.push('first-beforeLoad');
      });

      ScriptManager.shared.hooks.beforeLoad.tap('second-before', async () => {
        executionOrder.push('second-beforeLoad');
      });

      ScriptManager.shared.hooks.afterLoad.tap('first-after', async () => {
        executionOrder.push('first-afterLoad');
      });

      ScriptManager.shared.hooks.afterLoad.tap('second-after', async () => {
        executionOrder.push('second-afterLoad');
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

      ScriptManager.shared.hooks.beforeLoad.tap(
        'test-before',
        async ({ scriptId, caller }) => {
          expect(scriptId).toBe(customScriptId);
          expect(caller).toBe(customCaller);
          hookOrder.push('beforeLoad');
        }
      );

      ScriptManager.shared.hooks.load.tapAsync(
        'test-load',
        async (params, callback) => {
          expect(params.scriptId).toBe(customScriptId);
          expect(params.caller).toBe(customCaller);
          expect(params.locator).toBeDefined();
          hookOrder.push('load');

          try {
            await NativeScriptManager.loadScript(
              params.scriptId,
              params.locator
            );
            callback(null);
          } catch (error) {
            if (error instanceof Error) {
              callback(error);
            } else {
              callback(new Error('Unknown error occurred'));
            }
          }
        }
      );

      ScriptManager.shared.hooks.afterLoad.tap(
        'test-after',
        async ({ scriptId, caller }) => {
          expect(scriptId).toBe(customScriptId);
          expect(caller).toBe(customCaller);
          hookOrder.push('afterLoad');
        }
      );

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

      ScriptManager.shared.hooks.beforeLoad.tap('test-before', async () => {
        hookOrder.push('beforeLoad');
      });

      ScriptManager.shared.hooks.load.tapAsync(
        'test-load',
        async (_, callback) => {
          hookOrder.push('load');
          callback(expectedError);
        }
      );

      ScriptManager.shared.hooks.errorLoad.tap(
        'test-error',
        async ({ error }) => {
          expect(error).toBeDefined();
          expect(error).toBe(expectedError);
          hookOrder.push('errorLoad');
        }
      );

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
        ScriptManager.shared.hooks.beforeLoad.tap(
          `${prefix}-before`,
          async () => {
            hookOrder.push(`${prefix}-beforeLoad`);
          }
        );

        ScriptManager.shared.hooks.load.tapAsync(
          `${prefix}-load`,
          async (params, callback) => {
            hookOrder.push(`${prefix}-load`);
            if (prefix === 'second') {
              await NativeScriptManager.loadScript(
                params.scriptId,
                params.locator
              );
            }
            callback(null);
          }
        );

        ScriptManager.shared.hooks.afterLoad.tap(
          `${prefix}-after`,
          async () => {
            hookOrder.push(`${prefix}-afterLoad`);
          }
        );
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
