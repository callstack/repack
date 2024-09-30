import type { Compiler } from '@rspack/core';
import { Federated } from '../../utils';
import { ModuleFederationPlugin } from '../ModuleFederationPlugin';

const mockPlugin = jest.fn().mockImplementation(() => ({
  apply: jest.fn(),
}));

const mockCompiler = {
  webpack: { container: { ModuleFederationPluginV1: mockPlugin } },
} as unknown as Compiler;

describe('ModuleFederationPlugin', () => {
  it('should replace RemotesObject remotes', () => {
    new ModuleFederationPlugin({
      name: 'test',
      remotes: {
        external: 'external1@dynamic',
      },
    }).apply(mockCompiler);

    let config = mockPlugin.mock.calls[0][0];
    expect(config.remotes.external).toMatch('promise new Promise');
    mockPlugin.mockClear();

    new ModuleFederationPlugin({
      name: 'test',
      remotes: {
        external: ['external1@dynamic', 'external2@dynamic'],
      },
    }).apply(mockCompiler);

    config = mockPlugin.mock.calls[0][0];
    expect(config.remotes.external[0]).toMatch('promise new Promise');
    expect(config.remotes.external[1]).toMatch('promise new Promise');
    mockPlugin.mockClear();
  });

  it('should replace string[] remotes', () => {
    new ModuleFederationPlugin({
      name: 'test',
      remotes: ['remote1@dynamic', 'remote2@dynamic'],
    }).apply(mockCompiler);

    const config = mockPlugin.mock.calls[0][0];
    expect(config.remotes[0]).toMatch('promise new Promise');
    expect(config.remotes[1]).toMatch('promise new Promise');
    mockPlugin.mockClear();
  });

  it('should replace RemotesObject[] remotes', () => {
    new ModuleFederationPlugin({
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
    mockPlugin.mockClear();
  });

  it('should not add default resolver for remote', () => {
    new ModuleFederationPlugin({
      name: 'test',
      remotes: {
        app1: 'app1@dynamic',
      },
    }).apply(mockCompiler);

    const config = mockPlugin.mock.calls[0][0];
    expect(config.remotes.app1).toMatch('promise new Promise');
    expect(config.remotes.app1).not.toMatch('scriptManager.addResolver');
    mockPlugin.mockClear();
  });

  it('should add default resolver for remote', () => {
    new ModuleFederationPlugin({
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
    mockPlugin.mockClear();
  });

  it('should add default shared dependencies', () => {
    new ModuleFederationPlugin({ name: 'test' }).apply(mockCompiler);

    const config = mockPlugin.mock.calls[0][0];
    expect(config.shared).toHaveProperty('react');
    expect(config.shared).toHaveProperty('react-native');
    expect(config.shared).toHaveProperty('react-native/');
    expect(config.shared).toHaveProperty('@react-native/');
    mockPlugin.mockClear();
  });

  it('should not add deep imports to defaulted shared dependencies', () => {
    new ModuleFederationPlugin({
      name: 'test',
      reactNativeDeepImports: false,
    }).apply(mockCompiler);

    const config = mockPlugin.mock.calls[0][0];
    expect(config.shared).toHaveProperty('react');
    expect(config.shared).toHaveProperty('react-native');
    expect(config.shared).not.toHaveProperty('react-native/');
    expect(config.shared).not.toHaveProperty('@react-native/');
    mockPlugin.mockClear();
  });

  it('should add deep imports to existing shared dependencies', () => {
    new ModuleFederationPlugin({
      name: 'test',
      shared: {
        react: Federated.SHARED_REACT,
        'react-native': Federated.SHARED_REACT_NATIVE,
      },
    }).apply(mockCompiler);

    const config = mockPlugin.mock.calls[0][0];
    expect(config.shared).toHaveProperty('react-native/');
    expect(config.shared).toHaveProperty('@react-native/');
    mockPlugin.mockClear();
  });

  it('should not add deep imports to existing shared dependencies', () => {
    new ModuleFederationPlugin({
      name: 'test',
      reactNativeDeepImports: false,
      shared: {
        react: Federated.SHARED_REACT,
        'react-native': Federated.SHARED_REACT_NATIVE,
      },
    }).apply(mockCompiler);

    const config = mockPlugin.mock.calls[0][0];
    expect(config.shared).not.toHaveProperty('react-native/');
    expect(config.shared).not.toHaveProperty('@react-native/');
    mockPlugin.mockClear();
  });

  it('should not add deep imports to existing shared dependencies when react-native is not present', () => {
    new ModuleFederationPlugin({
      name: 'test',
      shared: {
        react: Federated.SHARED_REACT,
      },
    }).apply(mockCompiler);

    const config = mockPlugin.mock.calls[0][0];
    expect(config.shared).not.toHaveProperty('react-native/');
    expect(config.shared).not.toHaveProperty('@react-native/');
    mockPlugin.mockClear();
  });

  it('should add deep imports to existing shared dependencies array', () => {
    new ModuleFederationPlugin({
      name: 'test',
      shared: ['react', 'react-native'],
    }).apply(mockCompiler);

    const config = mockPlugin.mock.calls[0][0];
    expect(config.shared[2]).toHaveProperty('react-native/');
    expect(config.shared[3]).toHaveProperty('@react-native/');
    mockPlugin.mockClear();
  });

  it('should not duplicate or override existing deep imports', () => {
    new ModuleFederationPlugin({
      name: 'test',
      shared: {
        react: Federated.SHARED_REACT,
        'react-native': Federated.SHARED_REACT_NATIVE,
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
    mockPlugin.mockClear();
  });

  it('should determine eager based on shared react-native config', () => {
    new ModuleFederationPlugin({
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
    mockPlugin.mockClear();
  });
});
