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

const webpackRequireMock = () => [];

webpackRequireMock.i = [] as any[];
webpackRequireMock.l = () => {};
webpackRequireMock.u = (id: string) => `${id}.chunk.bundle`;
webpackRequireMock.p = () => '';
webpackRequireMock.repack = {
  shared: { scriptManager: undefined, enqueuedResolvers: [] },
};

globalThis.__webpack_require__ = webpackRequireMock;

const mockRemoteInfo = {
  name: 'remote1',
  entry: 'https://example-entry.com/remote1/entry.container.js.bundle',
  version: 'https://example-manifest.com/remote1/mf-manifest.json',
};

describe('RepackResolverPlugin', () => {
  describe('with ScriptManager not initialized', () => {
    afterEach(() => {
      // reset ScriptManager instance
      webpackRequireMock.repack.shared.scriptManager = undefined;
    });

    it('should register queued resolvers when ScriptManager is initialized', async () => {
      const plugin = RepackResolverPlugin();
      const enqueuedResolvers =
        webpackRequireMock.repack.shared.enqueuedResolvers;
      // trigger the plugin to register the resolver
      plugin.registerRemote!({ remote: mockRemoteInfo } as any);
      expect(enqueuedResolvers).toHaveLength(1);

      ScriptManager.init();
      // manually resolve the script to verify the result
      const script = await ScriptManager.shared.resolveScript(
        'remote1',
        undefined,
        webpackRequireMock,
        'https://example-entry.com/remoteEntry.js'
      );

      expect(script.locator.url).toBe(
        'https://example-manifest.com/remote1/remoteEntry.js'
      );
    });

    it('should clear the resolver queue on ScriptManager initialization', () => {
      const plugin = RepackResolverPlugin();
      const enqueuedResolvers =
        webpackRequireMock.repack.shared.enqueuedResolvers;
      // trigger the plugin to register the resolver
      plugin.registerRemote!({ remote: mockRemoteInfo } as any);
      expect(enqueuedResolvers).toHaveLength(1);
      ScriptManager.init();
      expect(enqueuedResolvers).toHaveLength(0);
    });

    it('should throw error when ScriptManager is not initialized', () => {
      const plugin = RepackResolverPlugin();
      const enqueuedResolvers =
        webpackRequireMock.repack.shared.enqueuedResolvers;
      // trigger the plugin to register the resolver
      plugin.registerRemote!({ remote: mockRemoteInfo } as any);
      expect(enqueuedResolvers).toHaveLength(1);
      expect(() => ScriptManager.shared.resolveScript('remote1')).toThrow();
    });
  });

  describe('with ScriptManager initialized', () => {
    beforeEach(() => {
      ScriptManager.init();

      // mock the error handler to disable polluting the console
      // @ts-expect-error private method
      ScriptManager.shared.handleError = () => {
        throw new Error('mocked error');
      };
    });

    afterEach(() => {
      // reset ScriptManager instance
      webpackRequireMock.repack.shared.scriptManager = undefined;
    });

    it('should resolve a script through a manifest', async () => {
      const plugin = RepackResolverPlugin();
      // trigger the plugin to register the resolver
      plugin.registerRemote!({ remote: mockRemoteInfo } as any);

      // manually resolve the script to verify the result
      const script = await ScriptManager.shared.resolveScript(
        'remote1',
        undefined,
        webpackRequireMock,
        'https://example-entry.com/remoteEntry.js'
      );

      expect(script.locator.url).toBe(
        'https://example-manifest.com/remote1/remoteEntry.js'
      );
    });

    it('should resolve a script through remote entry', async () => {
      const plugin = RepackResolverPlugin();
      // trigger the plugin to register the resolver
      plugin.registerRemote!({
        remote: { ...mockRemoteInfo, version: undefined },
      } as any);

      // manually resolve the script to verify the result
      const script = await ScriptManager.shared.resolveScript(
        'remote1',
        undefined,
        webpackRequireMock,
        'https://example-entry.com/remoteEntry.js'
      );

      expect(script.locator.url).toBe(
        'https://example-entry.com/remote1/remoteEntry.js'
      );
    });

    it('should allow custom configuration when used in runtime with a config object', async () => {
      const config = { headers: { Authorization: 'Bearer token' } };
      const plugin = RepackResolverPlugin(config);
      // trigger the plugin to register the resolver
      plugin.registerRemote!({ remote: mockRemoteInfo } as any);

      // manually resolve the script to verify the result
      const script = await ScriptManager.shared.resolveScript(
        'asset',
        'remote1',
        webpackRequireMock,
        'https://example-entry.com/remote1/asset.js'
      );

      expect(script.locator.headers).toEqual({ authorization: 'Bearer token' });
    });

    it('should allow custom configuration when used in runtime with a config function', async () => {
      const config = async (url: string): Promise<ScriptLocator> => ({
        url,
        headers: { Authorization: 'Bearer token' },
      });
      const plugin = RepackResolverPlugin(config);
      // trigger the plugin to register the resolver
      plugin.registerRemote!({ remote: mockRemoteInfo } as any);

      // manually resolve the script to verify the result
      const script = await ScriptManager.shared.resolveScript(
        'asset',
        'remote1',
        webpackRequireMock,
        'https://example-entry.com/remote1/asset.js'
      );

      expect(script.locator.headers).toEqual({ authorization: 'Bearer token' });
    });

    it('should throw error when reference URL is missing', async () => {
      const plugin = RepackResolverPlugin();
      // trigger the plugin to register the resolver
      plugin.registerRemote!({ remote: mockRemoteInfo } as any);

      // manually resolve the script to verify the result (should throw)
      await expect(
        ScriptManager.shared.resolveScript(
          'remote1',
          undefined,
          webpackRequireMock
        )
      ).rejects.toThrow();
    });

    it('should rebase URLs with custom configuration', async () => {
      const config = { headers: { Authorization: 'Bearer token' } };
      const plugin = RepackResolverPlugin(config);
      // trigger the plugin to register the resolver
      plugin.registerRemote!({ remote: mockRemoteInfo } as any);

      // manually resolve the script to verify the result
      const script = await ScriptManager.shared.resolveScript(
        'chunk1',
        'remote1',
        webpackRequireMock,
        'https://example-entry.com/remote1/assets/chunk1.js'
      );

      expect(script.locator.url).toBe(
        'https://example-manifest.com/remote1/chunk1.js'
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

      const plugin = RepackResolverPlugin();
      // trigger the plugin to register the resolver
      plugin.registerRemote!({ remote: mockRemoteInfo } as any);

      // manually resolve the script to verify the result
      const script = await ScriptManager.shared.resolveScript('other-remote');

      expect(defaultResolverMock).toHaveBeenCalled();
      expect(script.locator.url).toBe('http://default.com/script.js');
    });

    it('should rebase the URL from reference URL to entry URL', async () => {
      const plugin = RepackResolverPlugin();
      // trigger the plugin to register the resolver
      plugin.registerRemote!({
        remote: {
          name: 'remote1',
          entry: 'https://example.com/ios/remote1/entry.container.js.bundle',
          version: 'https://example-manifest.com/remote1/mf-manifest.json',
        },
      } as any);

      // manually resolve the script to verify the result
      const script1 = await ScriptManager.shared.resolveScript(
        'remote1',
        undefined,
        webpackRequireMock,
        'https://example.com/ios/remote1/entry.container.js.bundle'
      );

      // container entry is expected to be at the same level as manifest
      expect(script1.locator.url).toBe(
        'https://example-manifest.com/remote1/entry.container.js.bundle'
      );

      const script2 = await ScriptManager.shared.resolveScript(
        'asset',
        'remote1',
        webpackRequireMock,
        'http://localhost:8081/ios/remote1/asset.js'
      );

      // all other assets are expected to be at the same level as manifest
      expect(script2.locator.url).toBe(
        'https://example-manifest.com/remote1/asset.js'
      );
    });
  });
});
