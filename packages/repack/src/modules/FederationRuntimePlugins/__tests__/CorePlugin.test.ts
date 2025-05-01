import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScriptManager } from '../../ScriptManager/index.js';
import RepackCorePlugin from '../CorePlugin.js';

const mockedNativeLoadScript = vi.hoisted(() => vi.fn());

// Mock NativeScriptManager methods but keep the actual ScriptManager implementation
vi.mock('../../ScriptManager/NativeScriptManager.js', () => ({
  default: {
    loadScript: mockedNativeLoadScript,
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

// Get a reference to the mocked loadScript function
const webpackRequireMock = () => [];

webpackRequireMock.i = [] as any[];
webpackRequireMock.l = () => {};
webpackRequireMock.u = (id: string) => `${id}.chunk.bundle`;
webpackRequireMock.p = () => '';
webpackRequireMock.repack = {
  shared: { scriptManager: undefined },
};

globalThis.__webpack_require__ = webpackRequireMock;

const mockRemoteInfo = {
  name: 'remote1',
  entry: 'https://placeholder.com/remoteEntry.js',
  entryGlobalName: 'remote1_container',
};

describe('RepackCorePlugin', () => {
  beforeEach(() => {
    ScriptManager.init();

    // mock the error handler to disable polluting the console
    // @ts-expect-error private method
    ScriptManager.shared.handleError = () => {
      throw new Error('mocked error');
    };

    mockedNativeLoadScript.mockImplementationOnce((scriptId: string) => {
      // @ts-expect-error remotes are loaded into the global scope
      globalThis[scriptId] = { get: vi.fn(), init: vi.fn() };
      return Promise.resolve();
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.restoreAllMocks();

    // reset ScriptManager instance
    webpackRequireMock.repack.shared.scriptManager = undefined;

    // @ts-expect-error remote entry global variable
    delete globalThis[mockRemoteInfo.entryGlobalName];
  });

  it('should load a remote entry', async () => {
    const plugin = RepackCorePlugin();

    ScriptManager.shared.addResolver(async (scriptId) => {
      if (scriptId === mockRemoteInfo.entryGlobalName) {
        return { url: mockRemoteInfo.entry };
      }
    });

    vi.spyOn(ScriptManager.shared, 'loadScript');
    const result = await plugin.loadEntry!({
      remoteInfo: mockRemoteInfo,
    } as any);

    expect(ScriptManager.shared.loadScript).toHaveBeenCalledWith(
      mockRemoteInfo.entryGlobalName,
      undefined,
      webpackRequireMock,
      mockRemoteInfo.entry
    );

    // Verify that the function returns the global variable
    expect(result).toEqual({
      get: expect.any(Function),
      init: expect.any(Function),
    });
  });

  it('should handle failure to load a remote entry', async () => {
    const plugin = RepackCorePlugin();

    mockedNativeLoadScript.mockRejectedValueOnce(
      new Error('Failed to load script')
    );

    vi.spyOn(console, 'error').mockImplementationOnce(() => {});
    const result = await plugin.loadEntry!({
      remoteInfo: mockRemoteInfo,
    } as any);

    expect(result).toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(
      `Failed to load remote entry: ${mockRemoteInfo.entryGlobalName}`
    );
  });

  it('should handle failure to expose the remote entry in the global scope', async () => {
    const plugin = RepackCorePlugin();

    mockedNativeLoadScript.mockResolvedValueOnce(undefined);

    vi.spyOn(console, 'error').mockImplementationOnce(() => {});
    const result = await plugin.loadEntry!({
      remoteInfo: mockRemoteInfo,
    } as any);

    expect(result).toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(
      `Failed to load remote entry: ${mockRemoteInfo.entryGlobalName}`
    );
  });

  it('should provide a noop generatePreloadAssets implementation', async () => {
    const plugin = RepackCorePlugin();

    const result = await plugin.generatePreloadAssets!({} as any);

    expect(result).toHaveProperty('cssAssets');
    expect(result).toHaveProperty('jsAssetsWithoutEntry');
    expect(result).toHaveProperty('entryAssets');
  });
});
