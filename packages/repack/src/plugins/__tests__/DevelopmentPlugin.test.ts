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

// Module Federation 2.x loads undici 7, which requires Node >= 20.18.1,
// so the official plugin can only be loaded on newer Node versions.
const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number);
const itWithOfficialMF =
  nodeMajor > 20 || (nodeMajor === 20 && nodeMinor >= 18) ? it : it.skip;

const loadMFPluginRspack = () =>
  jest.requireActual<typeof import('@module-federation/enhanced/rspack')>(
    '@module-federation/enhanced/rspack'
  ).ModuleFederationPlugin;

describe('DevelopmentPlugin', () => {
  itWithOfficialMF(
    'should add development entries to the container of an official MF plugin with exposes',
    () => {
      const MFPluginRspack = loadMFPluginRspack();
      const { compiler, getEntryNames } = createMockCompiler([
        new MFPluginRspack({
          name: 'remote',
          exposes: { './App': './App.js' },
        }),
      ]);
      new DevelopmentPlugin({ platform: 'ios' }).apply(compiler);

      expect(getEntryNames()).toEqual(['main', 'remote']);
    }
  );

  itWithOfficialMF('should skip an official MF plugin without exposes', () => {
    const MFPluginRspack = loadMFPluginRspack();
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
