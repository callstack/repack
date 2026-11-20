import type { Compiler } from '@rspack/core';
import { RepackPlugin } from '../RepackPlugin.js';

function mockPlugin() {
  return jest.fn().mockImplementation(() => ({ apply() {} }));
}

jest.mock('../BabelPlugin.js', () => ({ BabelPlugin: mockPlugin() }));
jest.mock('../DevelopmentPlugin.js', () => ({
  DevelopmentPlugin: mockPlugin(),
}));
jest.mock('../LoggerPlugin.js', () => ({ LoggerPlugin: mockPlugin() }));
jest.mock('../NativeEntryPlugin/index.js', () => ({
  NativeEntryPlugin: mockPlugin(),
}));
jest.mock('../OutputPlugin/index.js', () => ({ OutputPlugin: mockPlugin() }));
jest.mock('../RepackTargetPlugin/index.js', () => ({
  RepackTargetPlugin: mockPlugin(),
}));
jest.mock('../SourceMapPlugin.js', () => ({ SourceMapPlugin: mockPlugin() }));

function createCompiler() {
  return {
    webpack: {
      rspackVersion: '2.0.0',
      DefinePlugin: jest.fn().mockImplementation(() => ({ apply() {} })),
    },
    options: { name: 'ios', mode: 'production', context: '/', module: {} },
    getInfrastructureLogger: () => ({ warn: jest.fn() }),
  } as unknown as Compiler;
}

describe('RepackPlugin jsonParse option', () => {
  it('sets module.generator.json.JSONParse when jsonParse is set', () => {
    const compiler = createCompiler();

    new RepackPlugin({ jsonParse: false }).apply(compiler);

    expect(compiler.options.module.generator).toEqual({
      json: { JSONParse: false },
    });
  });

  it('leaves module.generator untouched when jsonParse is not set', () => {
    const compiler = createCompiler();

    new RepackPlugin().apply(compiler);

    expect(compiler.options.module.generator).toBeUndefined();
  });
});
