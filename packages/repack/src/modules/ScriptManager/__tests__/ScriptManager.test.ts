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

class FakeCache {
  data: Record<string, string> = {};

  async setItem(key: string, value: string) {
    this.data[key] = value;
  }

  async getItem(key: string) {
    return this.data[key] ?? null;
  }

  async removeItem(key: string) {
    delete this.data[key];
  }
}

class ScriptLoaderError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

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

describe('ScriptManagerAPI', () => {
  it('throw error if ScriptManager NativeModule was not found', async () => {
    // @ts-expect-error simulat missing native module
    await expect(() => new ScriptManager(null).shared).toThrow(
      /repack react-native module was not found/
    );
  });

  it('throw error if there are no resolvers', async () => {
    const spy = jest.spyOn(
      ScriptManager.shared,
      'handleError' as keyof ScriptManager
    );

    await expect(
      ScriptManager.shared.resolveScript('src_App_js', 'main')
    ).rejects.toThrow();

    expect(spy).toHaveBeenCalled();
    const lastCall = spy.mock.calls[spy.mock.calls.length - 1] as unknown as [
      any,
      string,
      ...any[],
    ];
    expect(lastCall[1]).toMatch(
      /^\[ScriptManager\] Failed while resolving script locator/
    );
  });

  it('throw error if no resolvers handled request', async () => {
    const spy = jest.spyOn(
      ScriptManager.shared,
      'handleError' as keyof ScriptManager
    );

    ScriptManager.shared.addResolver(async () => undefined);
    ScriptManager.shared.addResolver(async () => undefined);

    await expect(
      ScriptManager.shared.resolveScript('src_App_js', 'main')
    ).rejects.toThrow();

    expect(spy).toHaveBeenCalled();
    const lastCall = spy.mock.calls[spy.mock.calls.length - 1] as unknown as [
      any,
      string,
      ...any[],
    ];
    expect(lastCall[1]).toMatch(
      /^\[ScriptManager\] Failed while resolving script locator/
    );

    ScriptManager.shared.removeAllResolvers();
  });

  it('remove all resolvers', async () => {
    const spy = jest.spyOn(
      ScriptManager.shared,
      'handleError' as keyof ScriptManager
    );

    ScriptManager.shared.addResolver(async () => undefined);
    ScriptManager.shared.addResolver(async () => undefined);
    ScriptManager.shared.removeAllResolvers();

    await expect(
      ScriptManager.shared.resolveScript('src_App_js', 'main')
    ).rejects.toThrow();

    expect(spy).toHaveBeenCalled();
    const lastCall = spy.mock.calls[spy.mock.calls.length - 1] as unknown as [
      any,
      string,
      ...any[],
    ];
    expect(lastCall[1]).toMatch(
      /^\[ScriptManager\] Failed while resolving script locator/
    );
  });

  it('should generate uniqueId', async () => {
    const uniqueId = Script.getScriptUniqueId('src_App_js', 'main');
    expect(uniqueId).toEqual('main_src_App_js');

    ScriptManager.shared.addResolver(async (scriptId, caller) => {
      expect(caller).toEqual('main');

      return {
        url: Script.getRemoteURL(`http://domain.ext/${scriptId}`),
      };
    });

    const script = await ScriptManager.shared.resolveScript(
      'src_App_js',
      'main'
    );
    expect(script.locator.uniqueId).toEqual('main_src_App_js');
  });

  it('should generate uniqueId with undefined caller', async () => {
    const uniqueId = Script.getScriptUniqueId('src_App_js', undefined);
    expect(uniqueId).toEqual('src_App_js');

    ScriptManager.shared.addResolver(async (scriptId, caller) => {
      expect(caller).toEqual(undefined);

      return {
        url: Script.getRemoteURL(`http://domain.ext/${scriptId}`),
      };
    });

    const script = await ScriptManager.shared.resolveScript('src_App_js');
    expect(script.locator.uniqueId).toEqual('src_App_js');
  });

  it('should resolve with url only', async () => {
    const cache = new FakeCache();

    ScriptManager.shared.setStorage(cache);
    ScriptManager.shared.addResolver(async (scriptId, caller) => {
      expect(caller).toEqual('main');

      return {
        url: Script.getRemoteURL(`http://domain.ext/${scriptId}`),
      };
    });

    const script = await ScriptManager.shared.resolveScript(
      'src_App_js',
      'main'
    );
    expect(script.locator).toEqual({
      url: 'http://domain.ext/src_App_js.chunk.bundle',
      fetch: true,
      absolute: false,
      method: 'GET',
      timeout: Script.DEFAULT_TIMEOUT,
      verifyScriptSignature: 'off',
      uniqueId: 'main_src_App_js',
    });

    await ScriptManager.shared.loadScript('src_App_js', 'main');

    const {
      locator: { fetch },
    } = await ScriptManager.shared.resolveScript('src_App_js', 'main');
    expect(fetch).toBe(false);

    ScriptManager.shared.removeAllResolvers();

    ScriptManager.shared.addResolver(async (scriptId, caller) => {
      expect(caller).toEqual('main');

      return {
        url: Script.getRemoteURL(`http://domain.ext/subpath/${scriptId}`),
      };
    });

    const newScript = await ScriptManager.shared.resolveScript(
      'src_App_js',
      'main'
    );
    expect(newScript.locator).toEqual({
      url: 'http://domain.ext/subpath/src_App_js.chunk.bundle',
      fetch: true,
      absolute: false,
      method: 'GET',
      timeout: Script.DEFAULT_TIMEOUT,
      verifyScriptSignature: 'off',
      uniqueId: 'main_src_App_js',
    });
  });

  it('should resolve with custom extension', async () => {
    const cache = new FakeCache();
    ScriptManager.shared.setStorage(cache);
    ScriptManager.shared.addResolver(async (scriptId, caller) => {
      expect(caller).toEqual('main');

      return {
        url: Script.getRemoteURL(`http://domain.ext/${scriptId}.js`, {
          excludeExtension: true,
        }),
      };
    });

    const script = await ScriptManager.shared.resolveScript(
      'src_App_js',
      'main'
    );
    expect(script.locator).toEqual({
      url: 'http://domain.ext/src_App_js.js',
      fetch: true,
      absolute: false,
      method: 'GET',
      timeout: Script.DEFAULT_TIMEOUT,
      verifyScriptSignature: 'off',
      uniqueId: 'main_src_App_js',
    });
  });

  it('should resolve with query', async () => {
    const cache = new FakeCache();
    ScriptManager.shared.setStorage(cache);
    ScriptManager.shared.addResolver(async (scriptId, caller) => {
      expect(caller).toEqual('main');

      return {
        url: Script.getRemoteURL(`http://domain.ext/${scriptId}`),
        query: {
          accessCode: '1234',
          accessUid: 'asdf',
        },
      };
    });

    let script = await ScriptManager.shared.resolveScript('src_App_js', 'main');
    expect(script.locator).toEqual({
      url: 'http://domain.ext/src_App_js.chunk.bundle',
      fetch: true,
      absolute: false,
      method: 'GET',
      query: 'accessCode=1234&accessUid=asdf',
      timeout: Script.DEFAULT_TIMEOUT,
      verifyScriptSignature: 'off',
      uniqueId: 'main_src_App_js',
    });

    ScriptManager.shared.removeAllResolvers();
    ScriptManager.shared.addResolver(async (scriptId, caller) => {
      expect(caller).toEqual('main');

      return {
        url: Script.getRemoteURL(`http://domain.ext/${scriptId}`),
        query: 'token=some_token',
      };
    });

    script = await ScriptManager.shared.resolveScript('src_App_js', 'main');
    expect(script.locator.fetch).toBe(true);
    expect(script.locator.query).toEqual('token=some_token');
  });

  it('should resolve with headers', async () => {
    const cache = new FakeCache();
    ScriptManager.shared.setStorage(cache);
    ScriptManager.shared.addResolver(async (scriptId, caller) => {
      expect(caller).toEqual('main');

      return {
        url: Script.getRemoteURL(`http://domain.ext/${scriptId}`),
        headers: {
          'x-hello': 'world',
        },
      };
    });

    let script = await ScriptManager.shared.resolveScript('src_App_js', 'main');
    expect(script.locator).toEqual({
      url: 'http://domain.ext/src_App_js.chunk.bundle',
      fetch: true,
      absolute: false,
      method: 'GET',
      headers: { 'x-hello': 'world' },
      timeout: Script.DEFAULT_TIMEOUT,
      verifyScriptSignature: 'off',
      uniqueId: 'main_src_App_js',
    });

    ScriptManager.shared.removeAllResolvers();
    ScriptManager.shared.addResolver(async (scriptId, caller) => {
      expect(caller).toEqual('main');

      return {
        url: Script.getRemoteURL(`http://domain.ext/${scriptId}`),
        headers: {
          'x-hello': 'world',
          'x-changed': 'true',
        },
      };
    });

    script = await ScriptManager.shared.resolveScript('src_App_js', 'main');
    expect(script.locator).toEqual({
      url: 'http://domain.ext/src_App_js.chunk.bundle',
      fetch: true,
      absolute: false,
      method: 'GET',
      headers: { 'x-hello': 'world', 'x-changed': 'true' },
      timeout: Script.DEFAULT_TIMEOUT,
      verifyScriptSignature: 'off',
      uniqueId: 'main_src_App_js',
    });
  });

  it('should resolve with body', async () => {
    const cache = new FakeCache();
    ScriptManager.shared.setStorage(cache);
    ScriptManager.shared.addResolver(async (scriptId, caller) => {
      expect(caller).toEqual('main');

      return {
        url: Script.getRemoteURL(`http://domain.ext/${scriptId}`),
        method: 'POST',
        body: 'hello_world',
      };
    });

    let script = await ScriptManager.shared.resolveScript('src_App_js', 'main');
    expect(script.locator).toEqual({
      url: 'http://domain.ext/src_App_js.chunk.bundle',
      fetch: true,
      absolute: false,
      method: 'POST',
      body: 'hello_world',
      timeout: Script.DEFAULT_TIMEOUT,
      verifyScriptSignature: 'off',
      uniqueId: 'main_src_App_js',
    });

    ScriptManager.shared.removeAllResolvers();
    ScriptManager.shared.addResolver(async (scriptId, caller) => {
      expect(caller).toEqual('main');

      return {
        url: Script.getRemoteURL(`http://domain.ext/${scriptId}`),
        method: 'POST',
        body: 'message',
      };
    });

    script = await ScriptManager.shared.resolveScript('src_App_js', 'main');
    expect(script.locator).toEqual({
      url: 'http://domain.ext/src_App_js.chunk.bundle',
      fetch: true,
      absolute: false,
      method: 'POST',
      body: 'message',
      timeout: Script.DEFAULT_TIMEOUT,
      verifyScriptSignature: 'off',
      uniqueId: 'main_src_App_js',
    });
  });

  it('should resolve with absolute path', async () => {
    const cache = new FakeCache();
    ScriptManager.shared.setStorage(cache);
    ScriptManager.shared.addResolver(async (scriptId, caller) => {
      expect(caller).toEqual('main');

      return {
        url: Script.getFileSystemURL(`absolute/directory/${scriptId}`),
        cache: false,
        method: 'POST',
        absolute: true,
      };
    });

    const script = await ScriptManager.shared.resolveScript(
      'src_App_js',
      'main'
    );
    expect(script.locator).toEqual({
      url: 'file:///absolute/directory/src_App_js.chunk.bundle',
      fetch: true,
      absolute: true,
      method: 'POST',
      timeout: Script.DEFAULT_TIMEOUT,
      verifyScriptSignature: 'off',
      uniqueId: 'main_src_App_js',
    });
  });

  it('should resolve with shouldUpdateScript', async () => {
    const domainURL = 'http://domain.ext/';
    const otherDomainURL = 'http://other.domain.ext/';

    const cache = new FakeCache();
    ScriptManager.shared.setStorage(cache);

    // First time, cache is opt-in, shouldUpdateScript is false, so the script is not fetched
    ScriptManager.shared.addResolver(async (scriptId, caller) => {
      expect(caller).toEqual('main');

      return {
        url: Script.getRemoteURL(`${domainURL}${scriptId}`),
        cache: true,
        shouldUpdateScript: () => false,
      };
    });

    const script1 = await ScriptManager.shared.resolveScript(
      'src_App_js',
      'main'
    );
    await ScriptManager.shared.loadScript('src_App_js', 'main');
    expect(script1.locator.fetch).toBe(false);

    ScriptManager.shared.removeAllResolvers();

    // Second time, cache is opt-in, shouldUpdateScript is true, so the script is fetched
    ScriptManager.shared.addResolver(async (scriptId, caller) => {
      expect(caller).toEqual('main');

      return {
        url: Script.getRemoteURL(`${domainURL}${scriptId}`),
        cache: true,
        shouldUpdateScript: () => true,
      };
    });

    const script2 = await ScriptManager.shared.resolveScript(
      'src_App_js',
      'main'
    );
    await ScriptManager.shared.loadScript('src_App_js', 'main');
    expect(script2.locator.fetch).toBe(true);

    ScriptManager.shared.removeAllResolvers();

    // Third time, cache is opt-out, shouldUpdateScript is false, but the script is fetched since cache is opt-out
    ScriptManager.shared.addResolver(async (scriptId, caller) => {
      expect(caller).toEqual('main');

      return {
        url: Script.getRemoteURL(`${domainURL}${scriptId}`),
        cache: false,
        shouldUpdateScript: () => false,
      };
    });

    const script3 = await ScriptManager.shared.resolveScript(
      'src_App_js',
      'main'
    );
    await ScriptManager.shared.loadScript('src_App_js', 'main');
    expect(script3.locator.fetch).toBe(true);

    ScriptManager.shared.removeAllResolvers();

    // Fourth time, cache is opt-out, isScriptCacheOutdated is false since cache is opt-out, but the script is fetched
    ScriptManager.shared.addResolver(async (scriptId, caller) => {
      expect(caller).toEqual('main');

      return {
        url: Script.getRemoteURL(`${domainURL}${scriptId}`),
        cache: false,
        shouldUpdateScript: (_, __, isScriptCacheOutdated) => {
          expect(isScriptCacheOutdated).toEqual(false);

          return !!isScriptCacheOutdated;
        },
      };
    });

    const script4 = await ScriptManager.shared.resolveScript(
      'src_App_js',
      'main'
    );
    await ScriptManager.shared.loadScript('src_App_js', 'main');
    expect(script4.locator.fetch).toBe(true);

    ScriptManager.shared.removeAllResolvers();

    // Fifth time, cache is opt-in, isScriptCacheOutdated is false since domain url is not changed, so the script is not fetched since we return false in shouldUpdateScript
    ScriptManager.shared.addResolver(async (scriptId, caller) => {
      expect(caller).toEqual('main');

      return {
        url: Script.getRemoteURL(`${domainURL}${scriptId}`),
        cache: true,
        shouldUpdateScript: (_, __, isScriptCacheOutdated) => {
          expect(isScriptCacheOutdated).toEqual(false);

          return !!isScriptCacheOutdated;
        },
      };
    });

    const script5 = await ScriptManager.shared.resolveScript(
      'src_App_js',
      'main'
    );
    await ScriptManager.shared.loadScript('src_App_js', 'main');
    expect(script5.locator.fetch).toBe(false);

    ScriptManager.shared.removeAllResolvers();

    // Sixth time, cache is opt-in, isScriptCacheOutdated is true since domain url is changed, so the script is fetched since we return true in shouldUpdateScript
    ScriptManager.shared.addResolver(async (scriptId, caller) => {
      expect(caller).toEqual('main');

      return {
        url: Script.getRemoteURL(`${otherDomainURL}${scriptId}`),
        cache: true,
        shouldUpdateScript: (_, __, isScriptCacheOutdated) => {
          expect(isScriptCacheOutdated).toEqual(true);

          return !!isScriptCacheOutdated;
        },
      };
    });

    const script6 = await ScriptManager.shared.resolveScript(
      'src_App_js',
      'main'
    );
    expect(script6.locator.fetch).toBe(true);
  });

  it('should throw an error on non-network errors occurrence in load script with retry', async () => {
    const cache = new FakeCache();
    ScriptManager.shared.setStorage(cache);
    ScriptManager.shared.addResolver(async (scriptId, caller) => {
      expect(caller).toEqual('appB');

      return {
        url: Script.getRemoteURL(`http://domain.ext/${scriptId}`),
        retry: 2,
        retryDelay: 100,
      };
    });

    const scriptId = 'src_App_js';
    const script = await ScriptManager.shared.resolveScript(scriptId, 'appB');
    expect(script.locator).toEqual({
      url: 'http://domain.ext/src_App_js.chunk.bundle',
      fetch: true,
      absolute: false,
      method: 'GET',
      timeout: Script.DEFAULT_TIMEOUT,
      verifyScriptSignature: 'off',
      uniqueId: 'appB_' + scriptId,
      retry: 2,
      retryDelay: 100,
    });

    jest.useFakeTimers({ advanceTimers: true });
    jest.spyOn(global, 'setTimeout');

    // Mock the nativeScriptManager.loadScript to fail immediately on non network error
    jest
      .mocked(NativeScriptManager.loadScript)
      .mockRejectedValueOnce(
        new ScriptLoaderError('First attempt failed', 'ScriptEvalFailure')
      );

    await expect(
      ScriptManager.shared.loadScript(scriptId, 'appB')
    ).rejects.toThrow('First attempt failed');

    expect(setTimeout).toHaveBeenCalledTimes(0);
    expect(NativeScriptManager.loadScript).toHaveBeenCalledTimes(1);
    expect(NativeScriptManager.loadScript).toHaveBeenCalledWith(scriptId, {
      absolute: false,
      fetch: true,
      method: 'GET',
      retry: 2,
      retryDelay: 100,
      timeout: 30000,
      uniqueId: 'appB_' + scriptId,
      url: 'http://domain.ext/src_App_js.chunk.bundle',
      verifyScriptSignature: 'off',
    });
    jest.useRealTimers();
  });

  it('should load script with retry', async () => {
    const cache = new FakeCache();
    ScriptManager.shared.setStorage(cache);
    ScriptManager.shared.addResolver(async (scriptId, caller) => {
      expect(caller).toEqual('main');

      return {
        url: Script.getRemoteURL(`http://domain.ext/${scriptId}`),
        retry: 2,
        retryDelay: 100,
      };
    });

    const scriptId = 'src_App_js';
    const script = await ScriptManager.shared.resolveScript(scriptId, 'main');
    expect(script.locator).toEqual({
      url: 'http://domain.ext/src_App_js.chunk.bundle',
      fetch: true,
      absolute: false,
      method: 'GET',
      timeout: Script.DEFAULT_TIMEOUT,
      verifyScriptSignature: 'off',
      uniqueId: 'main_src_App_js',
      retry: 2,
      retryDelay: 100,
    });

    // Mock the nativeScriptManager.loadScript to fail twice and succeed on the third attempt
    jest
      .mocked(NativeScriptManager.loadScript)
      .mockRejectedValueOnce(
        new ScriptLoaderError('First attempt failed', 'RequestFailure')
      )
      .mockRejectedValueOnce(
        new ScriptLoaderError('Second attempt failed', 'RequestFailure')
      )
      .mockResolvedValueOnce(null);

    jest.useFakeTimers({ advanceTimers: true });
    await ScriptManager.shared.loadScript(scriptId, 'main');

    expect(NativeScriptManager.loadScript).toHaveBeenCalledTimes(3);
    expect(NativeScriptManager.loadScript).toHaveBeenCalledWith(scriptId, {
      absolute: false,
      fetch: true,
      method: 'GET',
      retry: 2,
      retryDelay: 100,
      timeout: 30000,
      uniqueId: 'main_src_App_js',
      url: 'http://domain.ext/src_App_js.chunk.bundle',
      verifyScriptSignature: 'off',
    });
    jest.useRealTimers();
  });

  it('should throw error if all retry attempts fail', async () => {
    const cache = new FakeCache();
    ScriptManager.shared.setStorage(cache);
    ScriptManager.shared.addResolver(async (scriptId) => {
      return {
        url: Script.getRemoteURL(`http://domain.ext/${scriptId}`),
        retry: 2,
        fetch: false,
        retryDelay: 100,
      };
    });

    const scriptId = 'src_App_js';
    // Mock the nativeScriptManager.loadScript to fail all attempts
    jest
      .mocked(NativeScriptManager.loadScript)
      .mockRejectedValueOnce(
        new ScriptLoaderError('First attempt failed', 'NetworkFailure')
      )
      .mockRejectedValueOnce(
        new ScriptLoaderError('Second attempt failed', 'NetworkFailure')
      )
      .mockRejectedValueOnce(
        new ScriptLoaderError('Third attempt failed', 'NetworkFailure')
      );

    jest.useFakeTimers({ advanceTimers: true });
    await expect(ScriptManager.shared.loadScript(scriptId)).rejects.toThrow(
      'Third attempt failed'
    );

    expect(NativeScriptManager.loadScript).toHaveBeenCalledTimes(3);
    expect(NativeScriptManager.loadScript).toHaveBeenCalledWith(scriptId, {
      absolute: false,
      fetch: true,
      method: 'GET',
      retry: 2,
      retryDelay: 100,
      timeout: 30000,
      uniqueId: scriptId,
      url: 'http://domain.ext/src_App_js.chunk.bundle',
      verifyScriptSignature: 'off',
    });
    jest.useRealTimers();
  });

  it('should retry with delay', async () => {
    const cache = new FakeCache();
    ScriptManager.shared.setStorage(cache);
    ScriptManager.shared.addResolver(async (scriptId) => {
      return {
        url: Script.getRemoteURL(`http://domain.ext/${scriptId}`),
        retry: 2,
        retryDelay: 100,
      };
    });

    const scriptId = 'src_App_js';
    // Mock the nativeScriptManager.loadScript to fail twice and succeed on the third attempt
    jest
      .mocked(NativeScriptManager.loadScript)
      .mockRejectedValueOnce(
        new ScriptLoaderError('First attempt failed', 'ScriptDownloadFailure')
      )
      .mockRejectedValueOnce(
        new ScriptLoaderError('Second attempt failed', 'ScriptDownloadFailure')
      )
      .mockResolvedValueOnce(null);

    jest.useFakeTimers({ advanceTimers: true });
    jest.spyOn(global, 'setTimeout');

    const loadScriptPromise = ScriptManager.shared.loadScript(scriptId);

    await expect(loadScriptPromise).resolves.toBeUndefined();

    expect(setTimeout).toHaveBeenCalledTimes(2);
    expect(NativeScriptManager.loadScript).toHaveBeenCalledTimes(3);
    jest.useRealTimers();
  });

  it('should await loadScript with same scriptId to finish', async () => {
    const spy = mockLoadScriptBasedOnFetch();

    const cache = new FakeCache();
    ScriptManager.shared.setStorage(cache);

    ScriptManager.shared.addResolver(async (scriptId, _caller) => {
      return {
        url: Script.getRemoteURL(scriptId),
        cache: true,
      };
    });

    let loadingScriptIsFinished = false;

    // loadScript should wait first time called loadScript although we are not awaited, because scriptId is same
    ScriptManager.shared.loadScript('miniApp').then(() => {
      loadingScriptIsFinished = true;
    });
    await ScriptManager.shared.loadScript('miniApp');

    expect(loadingScriptIsFinished).toEqual(true);

    spy.mockRestore();
  });

  it('should wait loadScript with same scriptId to finished in a complex scenario', async () => {
    const spy = mockLoadScriptBasedOnFetch();

    const cache = new FakeCache();
    ScriptManager.shared.setStorage(cache);

    ScriptManager.shared.addResolver(async (scriptId, _caller) => {
      return {
        url: Script.getRemoteURL(scriptId),
        cache: true,
      };
    });

    let loadingScriptIsFinished = false;
    let loadingScript2IsFinished = false;

    // loadScript should wait first time called loadScript although we are not awaited, because scriptId is same
    ScriptManager.shared.loadScript('miniApp').then(() => {
      loadingScriptIsFinished = true;
    });

    ScriptManager.shared.loadScript('miniApp2').then(() => {
      loadingScript2IsFinished = true;
    });
    await ScriptManager.shared.loadScript('miniApp');
    expect(loadingScriptIsFinished).toEqual(true);

    loadingScriptIsFinished = false;
    ScriptManager.shared.loadScript('miniApp').then(() => {
      loadingScriptIsFinished = true;
    });

    ScriptManager.shared.loadScript('miniApp2');
    await ScriptManager.shared.loadScript('miniApp');

    expect(loadingScriptIsFinished).toEqual(true);
    await ScriptManager.shared.loadScript('miniApp2');
    expect(loadingScript2IsFinished).toEqual(true);

    spy.mockRestore();
  });

  it('should wait loadScript and prefetchScript', async () => {
    const spy = mockLoadScriptBasedOnFetch();

    const cache = new FakeCache();
    ScriptManager.shared.setStorage(cache);

    ScriptManager.shared.addResolver(async (scriptId, _caller) => {
      return {
        url: Script.getRemoteURL(scriptId),
        cache: true,
      };
    });

    let prefetchScriptIsFinished = false;

    // loadScript should wait first time called loadScript although we are not awaited, because scriptId is same
    ScriptManager.shared.prefetchScript('miniApp').then(() => {
      prefetchScriptIsFinished = true;
    });
    await ScriptManager.shared.loadScript('miniApp');

    expect(prefetchScriptIsFinished).toEqual(true);

    spy.mockRestore();
  });

  it('should refetch failed script', async () => {
    jest.useFakeTimers({ advanceTimers: true });
    const spy = jest.spyOn(NativeScriptManager, 'loadScript');

    spy.mockRejectedValueOnce(
      (_scriptId: string, _scriptConfig: NormalizedScriptLocator) =>
        Promise.reject({ code: 'NetworkFailed' })
    );

    const cache = new FakeCache();
    ScriptManager.shared.setStorage(cache);

    ScriptManager.shared.addResolver(async (scriptId, _caller) => {
      return {
        url: Script.getRemoteURL(scriptId),
        cache: true,
      };
    });

    await expect(async () =>
      ScriptManager.shared.loadScript('miniApp')
    ).rejects.toThrow();

    // //expected to cache be empty
    expect(Object.keys(cache.data).length).toBe(0);

    await ScriptManager.shared.loadScript('miniApp');

    // expected to fetch again
    expect(spy.mock.lastCall?.[1].fetch).toBe(true);

    spy.mockRestore();
  });

  it('should call hooks in correct lifecycle order', async () => {
    const hookOrder: string[] = [];

    ScriptManager.shared.hooks.beforeResolve.tap(
      'test-before',
      ({ scriptId, caller }) => {
        hookOrder.push('beforeResolve');
        return { scriptId, caller };
      }
    );

    ScriptManager.shared.hooks.resolve.tapAsync(
      'test-during',
      (_, callback) => {
        hookOrder.push('resolve');
        callback(null, {
          scriptId: 'test-script',
          caller: 'main',
          result: {
            url: 'http://domain.ext/test-script',
          },
          resolvers: [],
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
        ({ scriptId, caller }) => {
          executionOrder.push(`${prefix}-beforeResolve`);
          return { scriptId, caller };
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
        ({ scriptId, caller }) => {
          hookOrder.push('beforeResolve');
          return { scriptId, caller };
        }
      );

      ScriptManager.shared.hooks.resolve.tapAsync(
        'test-during',
        (_, callback) => {
          hookOrder.push('resolve');
          callback(null, {
            scriptId: 'test-script',
            caller: 'main',
            result: {
              url: 'http://domain.ext/test-script',
            },
            resolvers: [],
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
        ScriptManager.shared.hooks.beforeResolve.tap(`${prefix}-before`, () => {
          executionOrder.push(`${prefix}-beforeResolve`);
          return { scriptId: 'test-script', caller: 'test-caller' };
        });

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
        ({ scriptId, caller }) => {
          expect(scriptId).toBe(originalScriptId);
          expect(caller).toBe(originalCaller);
          hookOrder.push('beforeResolve');
          return { scriptId: overriddenScriptId, caller: overriddenCaller };
        }
      );

      ScriptManager.shared.hooks.resolve.tapAsync(
        'test-during',
        ({ scriptId, caller }, callback) => {
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
        ({ scriptId, caller }) => {
          hookOrder.push('beforeResolve');
          return { scriptId, caller };
        }
      );

      ScriptManager.shared.hooks.resolve.tapAsync(
        'test-during',
        (_, callback) => {
          hookOrder.push('resolve');
          callback(null, {
            scriptId: 'test-script',
            caller: 'main',
            result: {
              url: 'http://domain.ext/test-script',
            },
            resolvers: [],
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
        ({ scriptId, caller }) => {
          hookOrder.push('beforeResolve');
          return { scriptId, caller };
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
