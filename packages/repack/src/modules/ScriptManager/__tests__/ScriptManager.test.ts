import NativeScriptManager from '../NativeScriptManager';
import { Script } from '../Script';
import { ScriptManager } from '../ScriptManager';

jest.mock('../NativeScriptManager', () => ({
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

globalThis.__webpack_require__ = {
  u: (id: string) => `${id}.chunk.bundle`,
  p: () => '',
  repack: {
    loadScript: jest.fn(),
    loadHotUpdate: jest.fn(),
    shared: { scriptManager: undefined },
  },
};

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
});

afterEach(() => {
  globalThis.__webpack_require__.repack.shared.scriptManager = undefined;
});

describe('ScriptManagerAPI', () => {
  it('throw error if ScriptManager NativeModule was not found', async () => {
    // @ts-expect-error simulat missing native module
    await expect(() => new ScriptManager(null).shared).toThrow(
      /repack react-native module was not found/
    );
  });

  it('throw error if there are no resolvers', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementationOnce(() => {});

    await expect(
      ScriptManager.shared.resolveScript('src_App_js', 'main')
    ).rejects.toThrow(/Error: No script resolvers were added/);

    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0]).toEqual(
      expect.stringMatching(
        /^\[ScriptManager\] Failed while resolving script locator/
      )
    );
  });

  it('throw error if no resolvers handled request', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementationOnce(() => {});

    ScriptManager.shared.addResolver(async () => undefined);
    ScriptManager.shared.addResolver(async () => undefined);

    await expect(
      ScriptManager.shared.resolveScript('src_App_js', 'main')
    ).rejects.toThrow(/No resolver was able to resolve script src_App_js/);

    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0]).toEqual(
      expect.stringMatching(
        /^\[ScriptManager\] Failed while resolving script locator/
      )
    );
  });

  it('remove all resolvers', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementationOnce(() => {});

    ScriptManager.shared.addResolver(async () => undefined);
    ScriptManager.shared.addResolver(async () => undefined);
    ScriptManager.shared.removeAllResolvers();

    await expect(
      ScriptManager.shared.resolveScript('src_App_js', 'main')
    ).rejects.toThrow(/Error: No script resolvers were added/);

    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0]).toEqual(
      expect.stringMatching(
        /^\[ScriptManager\] Failed while resolving script locator/
      )
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
      fetch: false,
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
      fetch: false,
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
});
