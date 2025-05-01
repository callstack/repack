import {  afterEach, describe, expect, it, vi } from 'vitest';
import type { MockedClass } from 'vitest';
import { ModuleFederationPlugin as MFPluginRspack } from '@module-federation/enhanced/rspack';
import type { Compiler } from '@rspack/core';
import { ModuleFederationPluginV2 } from '../ModuleFederationPluginV2.js';

type CompilerWarning = Error & {
  moduleDescriptor?: {
    name: string;
    identifier: string;
  };
};

vi.mock('@module-federation/enhanced/rspack');

const mockCompiler = {
  context: __dirname,
  options: {},
  webpack: {
    DefinePlugin: vi.fn(() => ({
      apply: vi.fn(),
    })),
    rspackVersion: '1.0.0',
  },
} as unknown as Compiler;

const mockPlugin = MFPluginRspack as unknown as MockedClass<
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
    const shared = config.shared as string[];
    expect(shared[2]).toHaveProperty('react-native/');
    expect(shared[3]).toHaveProperty('@react-native/');
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
    const shared = config.shared as Record<string, { singleton: boolean; eager: boolean }>;
    expect(shared).toHaveProperty('react-native/');
    expect(shared).toHaveProperty('@react-native/');
    expect(shared['react-native/']).toMatchObject({
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
    const shared = config.shared as Record<string, { singleton: boolean; eager: boolean }>;
    expect(shared).toHaveProperty('react-native/');
    expect(shared).toHaveProperty('@react-native/');
    expect(shared['react-native/'].eager).toBe(false);
    expect(shared['@react-native/'].eager).toBe(false);
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

  it('should ignore MF2 runtime dynamic import warnings', () => {
    const plugin = new ModuleFederationPluginV2({ name: 'test' });
    plugin.apply(mockCompiler);

    const ignoreWarnings = mockCompiler.options.ignoreWarnings as ((
      warning: CompilerWarning
    ) => boolean)[];

    const warning = new Error() as CompilerWarning;

    warning.moduleDescriptor = {
      name: '@module-federation/runtime/dist/index.cjs.js',
      identifier: '@module-federation/runtime/dist/index.cjs.js',
    };
    warning.message = `
      ⚠ Critical dependency: the request of a dependency is an expression
      ╭─[1222:93]
 1220 │ } else {
 1221 │     Promise.resolve(/* webpackIgnore: true */ /* @vite-ignore */ entry).then(function(p) {
 1222 │         return /*#__PURE__*/ _interop_require_wildcard._(require(p));
      ·                                                                  ──
 1223 │     }).then(resolve)["catch"](reject);
 1224 │ }
      ╰────
    `;

    expect(ignoreWarnings[1](warning)).toBe(true);

    // also works for runtime-core
    warning.moduleDescriptor = {
      name: '@module-federation/runtime-core/dist/index.cjs.js',
      identifier: '@module-federation/runtime-core/dist/index.cjs.js',
    };

    expect(ignoreWarnings[1](warning)).toBe(true);
  });

  it('should not cause a crash when warning does not have a moduleDescriptor', () => {
    const plugin = new ModuleFederationPluginV2({ name: 'test' });
    plugin.apply(mockCompiler);

    const ignoreWarnings = mockCompiler.options.ignoreWarnings as ((
      warning: CompilerWarning
    ) => boolean)[];

    const warning = new Error('some warning') as CompilerWarning;

    expect(() => ignoreWarnings[1](warning)).not.toThrow();
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
