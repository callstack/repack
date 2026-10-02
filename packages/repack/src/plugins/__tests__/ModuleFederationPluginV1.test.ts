import path from 'node:path';
import type { Compiler } from '@rspack/core';
import { ModuleFederationPluginV1 } from '../ModuleFederationPluginV1.js';

const mockPlugin = jest.fn().mockImplementation(() => ({
  apply: jest.fn(),
}));

const mockCompiler = {
  webpack: {
    container: {
      ModuleFederationPluginV1: mockPlugin, // rspack
      ModuleFederationPlugin: mockPlugin, // webpack
    },
  },
} as unknown as Compiler;

/**
 * Compiler stub with just enough surface for the opt-in manifest emission:
 * real `compilation`/`afterProcessAssets` tap chains, driven manually.
 */
function createHookCompiler(context: string) {
  const compilationTaps: Array<(compilation: unknown) => void> = [];
  const compiler = {
    context,
    options: { name: 'ios', output: { publicPath: 'auto' } },
    hooks: {
      compilation: {
        tap: (_name: string, cb: (compilation: unknown) => void) => {
          compilationTaps.push(cb);
        },
      },
    },
    webpack: {
      container: {
        ModuleFederationPluginV1: mockPlugin,
        ModuleFederationPlugin: mockPlugin,
      },
      sources: {
        RawSource: class {
          constructor(public value: string) {}
          source() {
            return this.value;
          }
        },
      },
    },
  };

  const emit = (plugin: ModuleFederationPluginV1) => {
    plugin.apply(compiler as unknown as Compiler);
    const assets: Record<string, string> = {};
    const compilation = {
      modules: new Set(),
      warnings: [],
      hooks: {
        afterProcessAssets: {
          tap: (_name: string, cb: () => void) => {
            cb();
          },
        },
      },
      getAsset: (name: string) =>
        assets[name]
          ? ({ source: { source: () => assets[name] } } as never)
          : undefined,
      emitAsset: (name: string, source: { source: () => string }) => {
        assets[name] = source.source();
      },
    };
    compilationTaps.forEach((cb) => {
      cb(compilation);
    });
    return assets;
  };

  return { compiler, emit };
}

describe('ModuleFederationPlugin', () => {
  afterEach(() => {
    mockPlugin.mockClear();
  });

  it('should replace RemotesObject remotes', () => {
    new ModuleFederationPluginV1({
      name: 'test',
      remotes: {
        external: 'external1@dynamic',
      },
    }).apply(mockCompiler);

    let config = mockPlugin.mock.calls[0][0];
    expect(config.remotes.external).toMatch('promise new Promise');
    mockPlugin.mockClear();

    new ModuleFederationPluginV1({
      name: 'test',
      remotes: {
        external: ['external1@dynamic', 'external2@dynamic'],
      },
    }).apply(mockCompiler);

    config = mockPlugin.mock.calls[0][0];
    expect(config.remotes.external[0]).toMatch('promise new Promise');
    expect(config.remotes.external[1]).toMatch('promise new Promise');
  });

  it('should replace string[] remotes', () => {
    new ModuleFederationPluginV1({
      name: 'test',
      remotes: ['remote1@dynamic', 'remote2@dynamic'],
    }).apply(mockCompiler);

    const config = mockPlugin.mock.calls[0][0];
    expect(config.remotes[0]).toMatch('promise new Promise');
    expect(config.remotes[1]).toMatch('promise new Promise');
  });

  it('should replace RemotesObject[] remotes', () => {
    new ModuleFederationPluginV1({
      name: 'test',
      remotes: [
        { external: 'external1@dynamic' },
        { external: ['external2@dynamic', 'external3@dynamic'] },
      ],
    }).apply(mockCompiler);

    const config = mockPlugin.mock.calls[0][0];
    expect(config.remotes[0].external).toMatch('promise new Promise');
    expect(config.remotes[1].external[0]).toMatch('promise new Promise');
    expect(config.remotes[1].external[1]).toMatch('promise new Promise');
  });

  it('should not add default resolver for remote', () => {
    new ModuleFederationPluginV1({
      name: 'test',
      remotes: {
        app1: 'app1@dynamic',
      },
    }).apply(mockCompiler);

    const config = mockPlugin.mock.calls[0][0];
    expect(config.remotes.app1).toMatch('promise new Promise');
    expect(config.remotes.app1).not.toMatch('scriptManager.addResolver');
  });

  it('should add default resolver for remote', () => {
    new ModuleFederationPluginV1({
      name: 'test',
      remotes: {
        app1: 'app1@http://localhost:6789/static/app1.container.bundle',
      },
    }).apply(mockCompiler);

    const config = mockPlugin.mock.calls[0][0];
    expect(config.remotes.app1).toMatch('promise new Promise');
    expect(config.remotes.app1).toMatch('scriptManager.addResolver');
    expect(config.remotes.app1).toMatch(
      'http://localhost:6789/static/app1.container.bundle'
    );
    expect(config.remotes.app1).toMatch(
      'http://localhost:6789/static/[name][ext]'
    );
  });

  it('should add default shared dependencies', () => {
    new ModuleFederationPluginV1({ name: 'test' }).apply(mockCompiler);

    const config = mockPlugin.mock.calls[0][0];
    expect(config.shared).toHaveProperty('react');
    expect(config.shared).toHaveProperty('react-native');
    expect(config.shared).toHaveProperty('react-native/');
    expect(config.shared).toHaveProperty('@react-native/');
  });

  it('should not add deep imports to defaulted shared dependencies', () => {
    new ModuleFederationPluginV1({
      name: 'test',
      reactNativeDeepImports: false,
    }).apply(mockCompiler);

    const config = mockPlugin.mock.calls[0][0];
    expect(config.shared).toHaveProperty('react');
    expect(config.shared).toHaveProperty('react-native');
    expect(config.shared).not.toHaveProperty('react-native/');
    expect(config.shared).not.toHaveProperty('@react-native/');
  });

  it('should add deep imports to existing shared dependencies', () => {
    new ModuleFederationPluginV1({
      name: 'test',
      shared: {
        react: { singleton: true, eager: true },
        'react-native': { singleton: true, eager: true },
      },
    }).apply(mockCompiler);

    const config = mockPlugin.mock.calls[0][0];
    expect(config.shared).toHaveProperty('react-native/');
    expect(config.shared).toHaveProperty('@react-native/');
  });

  it('should not add deep imports to existing shared dependencies', () => {
    new ModuleFederationPluginV1({
      name: 'test',
      reactNativeDeepImports: false,
      shared: {
        react: { singleton: true, eager: true },
        'react-native': { singleton: true, eager: true },
      },
    }).apply(mockCompiler);

    const config = mockPlugin.mock.calls[0][0];
    expect(config.shared).not.toHaveProperty('react-native/');
    expect(config.shared).not.toHaveProperty('@react-native/');
  });

  it('should not add deep imports to existing shared dependencies when react-native is not present', () => {
    new ModuleFederationPluginV1({
      name: 'test',
      shared: {
        react: { singleton: true, eager: true },
      },
    }).apply(mockCompiler);

    const config = mockPlugin.mock.calls[0][0];
    expect(config.shared).not.toHaveProperty('react-native/');
    expect(config.shared).not.toHaveProperty('@react-native/');
  });

  it('should add deep imports to existing shared dependencies array', () => {
    new ModuleFederationPluginV1({
      name: 'test',
      shared: ['react', 'react-native'],
    }).apply(mockCompiler);

    const config = mockPlugin.mock.calls[0][0];
    expect(config.shared[2]).toHaveProperty('react-native/');
    expect(config.shared[3]).toHaveProperty('@react-native/');
  });

  it('should not duplicate or override existing deep imports', () => {
    new ModuleFederationPluginV1({
      name: 'test',
      shared: {
        react: { singleton: true, eager: true },
        'react-native': { singleton: true, eager: true },
        'react-native/': { singleton: true, eager: true },
      },
    }).apply(mockCompiler);

    const config = mockPlugin.mock.calls[0][0];
    expect(config.shared).toHaveProperty('react-native/');
    expect(config.shared).toHaveProperty('@react-native/');
    expect(config.shared['react-native/']).toMatchObject({
      singleton: true,
      eager: true,
    });
  });

  it('should determine eager based on shared react-native config', () => {
    new ModuleFederationPluginV1({
      name: 'test',
      shared: {
        react: { singleton: true, eager: true },
        'react-native': { singleton: true, eager: false },
      },
    }).apply(mockCompiler);

    const config = mockPlugin.mock.calls[0][0];
    expect(config.shared).toHaveProperty('react-native/');
    expect(config.shared).toHaveProperty('@react-native/');
    expect(config.shared['react-native/'].eager).toBe(false);
    expect(config.shared['@react-native/'].eager).toBe(false);
  });

  it('should propagate import=false to deep react-native imports', () => {
    new ModuleFederationPluginV1({
      name: 'test',
      shared: {
        'react-native': { singleton: true, eager: false, import: false },
      },
    }).apply(mockCompiler);

    const config = mockPlugin.mock.calls[0][0];
    expect(config.shared).toHaveProperty('react-native/');
    expect(config.shared).toHaveProperty('@react-native/');
    expect(config.shared['react-native/'].import).toBe(false);
    expect(config.shared['@react-native/'].import).toBe(false);
  });

  it('should determine eager based on shared react-native config in array', () => {
    new ModuleFederationPluginV1({
      name: 'test',
      shared: [
        { react: { singleton: true, eager: true } },
        {
          'react-native': {
            singleton: true,
            eager: false,
            requiredVersion: '0.76.0',
          },
        },
      ],
    }).apply(mockCompiler);

    const config = mockPlugin.mock.calls[0][0];
    expect(config.shared[2]['react-native/'].eager).toBe(false);
    expect(config.shared[3]['@react-native/'].eager).toBe(false);
    expect(config.shared[2]['react-native/'].requiredVersion).toBe('0.76.0');
    expect(config.shared[3]['@react-native/'].requiredVersion).toBe('0.76.0');
  });

  it('should propagate import=false to deep imports in array', () => {
    new ModuleFederationPluginV1({
      name: 'test',
      shared: [{ 'react-native': { singleton: true, import: false } }],
    }).apply(mockCompiler);

    const config = mockPlugin.mock.calls[0][0];
    expect(config.shared[1]['react-native/'].import).toBe(false);
    expect(config.shared[2]['@react-native/'].import).toBe(false);
  });

  it('should set default federated entry filename', () => {
    new ModuleFederationPluginV1({
      name: 'test',
      exposes: {
        './App': './src/App',
      },
    }).apply(mockCompiler);

    const config = mockPlugin.mock.calls[0][0];
    expect(config.filename).toBe('test.container.bundle');
  });

  it('should allow for custom federated entry name through filename', () => {
    new ModuleFederationPluginV1({
      name: 'test',
      exposes: {
        './App': './src/App',
      },
      filename: 'remoteEntry.js',
    }).apply(mockCompiler);

    const config = mockPlugin.mock.calls[0][0];
    expect(config.filename).toBe('remoteEntry.js');
  });

  it('should not touch compiler hooks when the manifest option is absent', () => {
    // `mockCompiler` has no `hooks`: any unconditional hook registration
    // would throw here, so the existing mocks pin the default no-op behavior
    expect(() => {
      new ModuleFederationPluginV1({ name: 'test' }).apply(mockCompiler);
    }).not.toThrow();

    const config = mockPlugin.mock.calls[0][0];
    expect(config).not.toHaveProperty('manifest');
  });

  it('should emit repack-federation-manifest.json when manifest is enabled', () => {
    const { emit } = createHookCompiler(
      path.join(__dirname, '__fixtures__', 'manifest-context')
    );
    const assets = emit(
      new ModuleFederationPluginV1({
        name: 'app1',
        exposes: { './App': './src/App' },
        manifest: true,
      })
    );

    const manifest = JSON.parse(assets['repack-federation-manifest.json']);
    expect(manifest).toMatchObject({
      manifestVersion: 1,
      name: 'app1',
      metaData: { type: 'remote' },
    });
    const sharedNames = manifest.shared.map(
      (entry: { name: string }) => entry.name
    );
    expect(sharedNames).toEqual(
      expect.arrayContaining(['react', 'react-native'])
    );
    // Synthetic deep-import prefixes injected by the plugin must not leak
    // into the manifest as fake shared dependencies
    expect(sharedNames).not.toContain('react-native/');
    expect(sharedNames).not.toContain('@react-native/');
    expect(
      manifest.shared.find((entry: { name: string }) => entry.name === 'react')
    ).toMatchObject({
      version: '18.0.0-fixture',
      singleton: true,
      eager: true,
    });
    expect(manifest.reactNative.version).toBe('0.0.0-fixture');
  });

  it('should honor a custom fileName and keep it out of the inner plugin config', () => {
    const { emit } = createHookCompiler(
      path.join(__dirname, '__fixtures__', 'manifest-context')
    );
    const assets = emit(
      new ModuleFederationPluginV1({
        name: 'app1',
        manifest: { fileName: 'custom-manifest.json' },
      })
    );

    expect(assets['custom-manifest.json']).toBeDefined();
    expect(assets['repack-federation-manifest.json']).toBeUndefined();

    const config = mockPlugin.mock.calls[0][0];
    expect(config).not.toHaveProperty('manifest');
  });
});
