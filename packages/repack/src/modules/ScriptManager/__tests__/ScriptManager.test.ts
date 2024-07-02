/* eslint-disable require-await */
/* globals globalThis */
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

// @ts-ignore
globalThis.__webpack_require__ = {
  u: (id: string) => `${id}.chunk.bundle`,
  p: '',
  repack: { shared: { loadScriptCallback: [] } },
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

beforeEach(() => {
  try {
    ScriptManager.shared.__destroy();
  } catch {
    // NOOP
  }
});

describe('ScriptManagerAPI', () => {
  it('throw error if ScriptManager NativeModule was not found', async () => {
    await expect(() => new ScriptManager(null).shared).toThrow(
      /repack react-native module was not found/
    );
  });

  it('throw error if there are no resolvers', async () => {
    await expect(
      ScriptManager.shared.resolveScript('src_App_js', 'main')
    ).rejects.toThrow(/Error: No script resolvers were added/);
  });

  it('throw error if no resolvers handled request', async () => {
    ScriptManager.shared.addResolver(async () => undefined);
    ScriptManager.shared.addResolver(async () => undefined);

    await expect(
      ScriptManager.shared.resolveScript('src_App_js', 'main')
    ).rejects.toThrow(/No resolver was able to resolve script src_App_js/);
  });

  it('remove all resolvers', async () => {
    ScriptManager.shared.addResolver(async () => undefined);
    ScriptManager.shared.addResolver(async () => undefined);
    ScriptManager.shared.removeAllResolvers();

    await expect(
      ScriptManager.shared.resolveScript('src_App_js', 'main')
    ).rejects.toThrow(/Error: No script resolvers were added/);
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
      body: null,
      headers: null,
      query: null,
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
      body: null,
      headers: null,
      query: null,
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
      body: null,
      headers: null,
      query: null,
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
      body: null,
      headers: null,
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
      body: null,
      query: null,
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
      body: null,
      query: null,
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
      headers: null,
      query: null,
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
      headers: null,
      query: null,
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
      body: null,
      headers: null,
      query: null,
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
});
