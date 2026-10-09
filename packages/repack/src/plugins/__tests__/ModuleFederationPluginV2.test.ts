import { ModuleFederationPlugin as MFPluginRspack } from '@module-federation/enhanced/rspack';
import type { Compiler } from '@rspack/core';
import { ModuleFederationPluginV2 } from '../ModuleFederationPluginV2.js';

type CompilerWarning = Error;

jest.mock('@module-federation/enhanced/rspack', () => ({
  ModuleFederationPlugin: jest.fn(() => ({ apply: jest.fn() })),
}));

const mockCompiler = {
  context: __dirname,
  options: {},
  webpack: {
    DefinePlugin: jest.fn(() => ({
      apply: jest.fn(),
    })),
    rspackVersion: '1.0.0',
  },
} as unknown as Compiler;

const mockPlugin = MFPluginRspack as unknown as jest.Mock<
  typeof MFPluginRspack
>;

const corePluginPath = require.resolve('@callstack/repack/mf/core-plugin');
const resolverPluginPath = require.resolve(
  '@callstack/repack/mf/resolver-plugin'
);
const prefetchPluginPath = require.resolve(
  '@callstack/repack/mf/prefetch-plugin'
);

describe('ModuleFederationPlugin', () => {
  afterEach(() => {
    mockPlugin.mockClear();
  });

  it('should add default shared dependencies', () => {
    new ModuleFederationPluginV2({ name: 'test' }).apply(mockCompiler);

    const config = mockPlugin.mock.calls[0][0];
    expect(config.shared).toHaveProperty('react');
    expect(config.shared).toHaveProperty('react-native');
    expect(config.shared).toHaveProperty('react-native/');
    expect(config.shared).toHaveProperty('@react-native/');
  });

  it('should not add deep imports to defaulted shared dependencies', () => {
    new ModuleFederationPluginV2({
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
    new ModuleFederationPluginV2({
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
    new ModuleFederationPluginV2({
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
    new ModuleFederationPluginV2({
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
    new ModuleFederationPluginV2({
      name: 'test',
      shared: ['react', 'react-native'],
    }).apply(mockCompiler);

    const config = mockPlugin.mock.calls[0][0];
    expect(config.shared[2]).toHaveProperty('react-native/');
    expect(config.shared[3]).toHaveProperty('@react-native/');
  });

  it('should not duplicate or override existing deep imports', () => {
    new ModuleFederationPluginV2({
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
    new ModuleFederationPluginV2({
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
    new ModuleFederationPluginV2({
      name: 'test',
      shared: {
        react: { singleton: true, eager: true },
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
    new ModuleFederationPluginV2({
      name: 'test',
      shared: [
        { react: { singleton: true, eager: true } },
        { 'react-native': { singleton: true, eager: false } },
      ],
    }).apply(mockCompiler);

    const config = mockPlugin.mock.calls[0][0];
    expect(config.shared[2]['react-native/'].eager).toBe(false);
    expect(config.shared[3]['@react-native/'].eager).toBe(false);
  });

  it('should propagate import=false to deep imports in array', () => {
    new ModuleFederationPluginV2({
      name: 'test',
      shared: [{ 'react-native': { singleton: true, import: false } }],
    }).apply(mockCompiler);

    const config = mockPlugin.mock.calls[0][0];
    expect(config.shared[1]['react-native/'].import).toBe(false);
    expect(config.shared[2]['@react-native/'].import).toBe(false);
  });

  it('should add CorePlugin & ResolverPlugin to runtime plugins by default', () => {
    new ModuleFederationPluginV2({ name: 'test' }).apply(mockCompiler);

    const config = mockPlugin.mock.calls[0][0];
    expect(config.runtimePlugins).toContain(corePluginPath);
    expect(config.runtimePlugins).toContain(resolverPluginPath);
  });

  it('should not add duplicate default runtime plugins when already present', () => {
    new ModuleFederationPluginV2({
      name: 'test',
      runtimePlugins: [corePluginPath, resolverPluginPath],
    }).apply(mockCompiler);

    const config = mockPlugin.mock.calls[0][0];
    expect(config.runtimePlugins).toContain(corePluginPath);
    expect(config.runtimePlugins).toContain(resolverPluginPath);
    expect(config.runtimePlugins).toContain(prefetchPluginPath);
    expect(config.runtimePlugins).toHaveLength(3);
  });

  it('should keep runtime plugins passed with options', () => {
    new ModuleFederationPluginV2({
      name: 'test',
      runtimePlugins: [[corePluginPath, { custom: true }]],
    }).apply(mockCompiler);

    const config = mockPlugin.mock.calls[0][0];
    expect(config.runtimePlugins).toContainEqual([
      corePluginPath,
      { custom: true },
    ]);
    expect(config.runtimePlugins).not.toContain(corePluginPath);
    expect(config.runtimePlugins).toContain(resolverPluginPath);
    expect(config.runtimePlugins).toContain(prefetchPluginPath);
    expect(config.runtimePlugins).toHaveLength(3);
  });

  it('should use loaded-first as default shareStrategy', () => {
    new ModuleFederationPluginV2({ name: 'test' }).apply(mockCompiler);

    const config = mockPlugin.mock.calls[0][0];
    expect(config.shareStrategy).toEqual('loaded-first');
  });

  it('should allow overriding shareStartegy', () => {
    new ModuleFederationPluginV2({
      name: 'test',
      shareStrategy: 'version-first',
    }).apply(mockCompiler);

    const config = mockPlugin.mock.calls[0][0];
    expect(config.shareStrategy).toEqual('version-first');
  });

  it('should ignore EnvironmentNotSupportAsyncWarning', () => {
    const plugin = new ModuleFederationPluginV2({ name: 'test' });
    plugin.apply(mockCompiler);

    const ignoreWarnings = mockCompiler.options.ignoreWarnings as ((
      warning: CompilerWarning
    ) => boolean)[];
    const warning = new Error() as CompilerWarning;
    warning.name = 'EnvironmentNotSupportAsyncWarning';
    warning.message = 'Environment does not support async';

    expect(ignoreWarnings[0](warning)).toBe(true);
  });

  it('should throw an error for an invalid container name', () => {
    const invalidContainerNames = [
      'app-name',
      '123AppName',
      'app@name',
      'app name',
    ];

    invalidContainerNames.forEach((name) => {
      expect(() => {
        new ModuleFederationPluginV2({ name }).apply(mockCompiler);
      }).toThrow(
        `[RepackModuleFederationPlugin] The container's name: '${name}' must be a valid JavaScript identifier. ` +
          'Please correct it to proceed.'
      );
    });
  });

  it('should not throw an error for a valid container name', () => {
    const validContainerNames = [
      'app_name',
      'appName',
      'appName123',
      '$appName',
    ];

    validContainerNames.forEach((name) => {
      expect(() => {
        new ModuleFederationPluginV2({ name }).apply(mockCompiler);
      }).not.toThrow();
    });
  });
});
