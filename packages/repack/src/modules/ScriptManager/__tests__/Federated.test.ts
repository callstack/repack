import { Script } from '../Script';
import { ScriptManager } from '../ScriptManager';

jest.mock('../NativeScriptManager', () => ({
  loadScript: jest.fn((locator) =>
    locator.fetch
      ? new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 10);
        })
      : Promise.resolve()
  ),
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

beforeEach(() => {
  ScriptManager.init();
});

afterEach(() => {
  globalThis.__webpack_require__.repack.shared.scriptManager = undefined;
});

describe('Federated', () => {
  it('should await loadScript with same scriptId to finish ', async () => {
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
  });

  it('should wait loadScript with same scriptId to finished in a complex scenario', async () => {
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
  });

  it('should wait loadScript and prefetchScript', async () => {
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
  });
});
