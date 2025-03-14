import {
  type ScriptLocator,
  ScriptManager,
} from '../../ScriptManager/index.js';
import RepackResolverPlugin from '../ResolverPlugin.js';

jest.mock('../../ScriptManager/NativeScriptManager.js', () => ({
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

// Mock the global webpack context for testing
(global as any).__webpack_require__ = {
  repack: {
    shared: {},
    u: (id: string) => `${id}.chunk.bundle`,
    p: 'http://localhost:8081/',
  },
};

describe('RepackResolverPlugin', () => {
  beforeEach(() => {
    // Reset ScriptManager before each test
    ScriptManager.init();

    // Clear all resolvers
    ScriptManager.shared.removeAllResolvers();
  });

  it('should accept object configuration', () => {
    // Use a valid ScriptLocator property
    const config = { headers: { Authorization: 'Bearer token' } };
    const plugin = RepackResolverPlugin(config);
    expect(plugin.name).toBe('repack-resolver-plugin');
    expect(typeof plugin.afterResolve).toBe('function');
  });

  it('should accept function configuration', () => {
    const config = async (url: string): Promise<ScriptLocator> => ({
      url,
      headers: { Authorization: 'Bearer token' },
    });
    const plugin = RepackResolverPlugin(config);
    expect(plugin.name).toBe('repack-resolver-plugin');
    expect(typeof plugin.afterResolve).toBe('function');
  });

  describe('integration tests', () => {
    const mockRemoteInfo = {
      name: 'remote1',
      entry: 'https://example.com/remote1/entry.container.js.bundle',
      version: 'https://example.com/remote1/mf-manifest.json',
    };

    it('should resolve a script using version URL when available', async () => {
      // Create and apply the plugin
      const plugin = RepackResolverPlugin();
      // Trigger the plugin to register the resolver
      plugin.afterResolve!({ remoteInfo: mockRemoteInfo } as any);

      // Now use ScriptManager to resolve a script from the remote
      const script = await ScriptManager.shared.resolveScript(
        'remote1',
        'remote1',
        (global as any).__webpack_require__,
        'https://example.com/remote1/asset.js'
      );

      // Verify the script was resolved with the correct URL
      expect(script.locator.url).toBe('https://example.com/remote1/asset.js');
      expect(script.locator.fetch).toBe(true);
    });

    it('should resolve a script using entry URL when version is not available', async () => {
      const plugin = RepackResolverPlugin();

      plugin.afterResolve!({
        remoteInfo: { ...mockRemoteInfo, version: undefined },
      } as any);

      // Now use ScriptManager to resolve a script from the remote
      const script = await ScriptManager.shared.resolveScript(
        'remote1',
        'remote1',
        (global as any).__webpack_require__,
        'https://example.com/remote1/asset.js'
      );

      // Verify the script was resolved with the correct URL
      expect(script.locator.url).toBe('https://example.com/remote1/asset.js');
      expect(script.locator.fetch).toBe(true);
    });

    it('should apply object configuration to script locator', async () => {
      const config = { headers: { Authorization: 'Bearer token' } };
      const plugin = RepackResolverPlugin(config);
      // Trigger the plugin to register the resolver
      plugin.afterResolve!({ remoteInfo: mockRemoteInfo } as any);

      // Now use ScriptManager to resolve a script from the remote
      const script = await ScriptManager.shared.resolveScript(
        'remote1',
        'remote1',
        (global as any).__webpack_require__,
        'https://example.com/remote1/asset.js'
      );

      // Verify the script was resolved with the correct headers
      expect(script.locator.headers).toEqual({ authorization: 'Bearer token' });
    });

    it('should apply function configuration to script locator', async () => {
      const config = async (url: string): Promise<ScriptLocator> => ({
        url,
        headers: { Authorization: 'Bearer token' },
      });
      const plugin = RepackResolverPlugin(config);
      // Trigger the plugin to register the resolver
      plugin.afterResolve!({ remoteInfo: mockRemoteInfo } as any);

      // Now use ScriptManager to resolve a script from the remote
      const script = await ScriptManager.shared.resolveScript(
        'remote1',
        'remote1',
        (global as any).__webpack_require__,
        'https://example.com/remote1/asset.js'
      );

      // Verify the script was resolved with the correct headers
      expect(script.locator.headers).toEqual({ authorization: 'Bearer token' });
    });

    it('should throw error when reference URL is missing', async () => {
      const plugin = RepackResolverPlugin();
      // Trigger the plugin to register the resolver
      plugin.afterResolve!({ remoteInfo: mockRemoteInfo } as any);

      // Now try to resolve a script without a reference URL
      await expect(
        ScriptManager.shared.resolveScript(
          'remote1',
          'remote1',
          (global as any).__webpack_require__
        )
      ).rejects.toThrow();
    });

    it('should properly rebase URLs with custom configuration', async () => {
      // Create and apply the plugin with custom configuration
      const config = { headers: { Authorization: 'Bearer token' } };
      const plugin = RepackResolverPlugin(config);
      // Trigger the plugin to register the resolver
      plugin.afterResolve!({ remoteInfo: mockRemoteInfo } as any);

      // Now use ScriptManager to resolve a script from the remote with a nested path
      const script = await ScriptManager.shared.resolveScript(
        'remote1',
        'remote1',
        (global as any).__webpack_require__,
        'https://example.com/remote1/assets/nested/chunk1.js'
      );

      // Verify the script was resolved with the correct URL and headers
      expect(script.locator.url).toBe(
        'https://example.com/remote1/assets/nested/chunk1.js'
      );
      expect(script.locator.headers).toEqual({ authorization: 'Bearer token' });
      expect(script.locator.fetch).toBe(true);
    });

    it('should not resolve scripts for other remotes', async () => {
      // Add a default resolver to handle other remotes
      const defaultResolverMock = jest.fn().mockResolvedValue({
        url: 'http://default.com/script.js',
      });

      ScriptManager.shared.addResolver(defaultResolverMock);

      // Create and apply the plugin
      const plugin = RepackResolverPlugin();
      // Trigger the plugin to register the resolver
      plugin.afterResolve!({ remoteInfo: mockRemoteInfo } as any);

      // Now try to resolve a script for a different remote
      await ScriptManager.shared.resolveScript(
        'other-remote',
        'other-remote',
        (global as any).__webpack_require__,
        'https://example.com/other-remote/asset.js'
      );

      // Verify the default resolver was called
      expect(defaultResolverMock).toHaveBeenCalled();
    });

    it('should rebase the URL correctly', async () => {
      // Create and apply the plugin
      const plugin = RepackResolverPlugin();
      // Trigger the plugin to register the resolver
      plugin.afterResolve!({ remoteInfo: mockRemoteInfo } as any);

      // Now use ScriptManager to resolve a script with a different path
      const script = await ScriptManager.shared.resolveScript(
        'remote1',
        'remote1',
        (global as any).__webpack_require__,
        'https://example.com/remote1/subdir/asset.js'
      );

      // Verify the URL was rebased correctly
      expect(script.locator.url).toBe(
        'https://example.com/remote1/subdir/asset.js'
      );
    });
  });
});
