import { ModuleFederationPlugin as MFPluginRspack } from '@module-federation/enhanced/rspack';
import type { Compiler, EntryNormalized } from '@rspack/core';
import { DevelopmentPlugin } from '../DevelopmentPlugin.js';
import { ModuleFederationPluginV2 } from '../ModuleFederationPluginV2.js';

const createMockCompiler = (plugins: unknown[]) => {
  const EntryPlugin = jest.fn(() => ({ apply: jest.fn() }));
  let onEntryOption: (context: string, entry: EntryNormalized) => void =
    () => {};

  const compiler = {
    context: __dirname,
    options: {
      devServer: { hot: true, host: 'localhost', port: 8081 },
      output: { uniqueName: 'test' },
      resolve: { alias: {} },
      module: { rules: [] },
      plugins,
    },
    hooks: {
      entryOption: {
        tap: (_: unknown, callback: typeof onEntryOption) => {
          onEntryOption = callback;
        },
      },
    },
    webpack: {
      rspackVersion: '1.0.0',
      DefinePlugin: jest.fn(() => ({ apply: jest.fn() })),
      HotModuleReplacementPlugin: jest.fn(() => ({ apply: jest.fn() })),
      ProvidePlugin: jest.fn(() => ({ apply: jest.fn() })),
      Template: { toIdentifier: (name: string) => name },
      EntryPlugin,
    },
  } as unknown as Compiler;

  return {
    compiler,
    getEntryNames: () => {
      onEntryOption(__dirname, { main: { import: ['./index.js'] } });
      const calls = EntryPlugin.mock.calls as unknown as Array<
        [string, string, { name: string }]
      >;
      return [...new Set(calls.map(([, , options]) => options.name))];
    },
  };
};

describe('DevelopmentPlugin', () => {
  it('should add development entries to the container of an official MF plugin with exposes', () => {
    const { compiler, getEntryNames } = createMockCompiler([
      new MFPluginRspack({ name: 'remote', exposes: { './App': './App.js' } }),
    ]);
    new DevelopmentPlugin({ platform: 'ios' }).apply(compiler);

    expect(getEntryNames()).toEqual(['main', 'remote']);
  });

  it('should skip an official MF plugin without exposes', () => {
    const { compiler, getEntryNames } = createMockCompiler([
      new MFPluginRspack({ name: 'host' }),
    ]);
    new DevelopmentPlugin({ platform: 'ios' }).apply(compiler);

    expect(getEntryNames()).toEqual(['main']);
  });

  it('should add development entries to the container of a Re.Pack MF plugin with exposes', () => {
    const { compiler, getEntryNames } = createMockCompiler([
      new ModuleFederationPluginV2({
        name: 'remote',
        exposes: { './App': './App.js' },
      }),
    ]);
    new DevelopmentPlugin({ platform: 'ios' }).apply(compiler);

    expect(getEntryNames()).toEqual(['main', 'remote']);
  });
});
