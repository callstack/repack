import { ModuleFederationPlugin as MFPluginRspack } from '@module-federation/enhanced/rspack';
import type { Compiler } from '@rspack/core';
import { ModuleFederationPluginV2 } from '../ModuleFederationPluginV2';

jest.mock('@module-federation/enhanced/rspack');

const mockCompiler = {
  context: __dirname,
  options: {},
  webpack: {
    rspackVersion: '1.0.0',
  },
} as unknown as Compiler;

const mockPlugin = MFPluginRspack as unknown as jest.Mock<
  typeof MFPluginRspack
>;

const corePluginPath = require.resolve(
  '../../modules/FederationRuntimePlugins/CorePlugin'
);
const resolverPluginPath = require.resolve(
  '../../modules/FederationRuntimePlugins/ResolverPlugin'
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
    expect(config.runtimePlugins).toHaveLength(2);
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
});
