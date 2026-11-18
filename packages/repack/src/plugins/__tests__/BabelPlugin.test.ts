import type { Compiler } from '@rspack/core';
import { BabelPlugin } from '../BabelPlugin.js';

const compilerMock: { options: Compiler['options'] } = {
  options: {} as Compiler['options'],
};

describe('BabelPlugin', () => {
  it('sets resolveLoader.fallback[babel-loader] as an array entry', () => {
    const pluginInstance = new BabelPlugin();
    pluginInstance.apply(compilerMock as unknown as Compiler);

    expect(compilerMock.options.resolveLoader?.fallback).toEqual({
      'babel-loader': [expect.any(String)],
    });
  });

  it('preserves existing record fallback entries', () => {
    compilerMock.options.resolveLoader = {
      fallback: { 'foo-loader': '/path/to/foo-loader' },
    };
    const pluginInstance = new BabelPlugin();
    pluginInstance.apply(compilerMock as unknown as Compiler);

    expect(compilerMock.options.resolveLoader.fallback).toEqual({
      'foo-loader': '/path/to/foo-loader',
      'babel-loader': [expect.any(String)],
    });
  });

  it('exposes the platform to loaders through options.loader', () => {
    compilerMock.options.loader = { existing: true };
    new BabelPlugin({ platform: 'ios' }).apply(
      compilerMock as unknown as Compiler
    );

    expect(compilerMock.options.loader).toEqual({
      existing: true,
      repack: { platform: 'ios' },
    });
  });

  it('falls back to the compiler name as the platform', () => {
    const compiler = {
      options: { name: 'android' } as Compiler['options'],
    };
    new BabelPlugin().apply(compiler as unknown as Compiler);

    expect(compiler.options.loader).toEqual({
      repack: { platform: 'android' },
    });
  });

  it('leaves options.loader untouched when the platform is unknown', () => {
    const compiler = { options: {} as Compiler['options'] };
    new BabelPlugin().apply(compiler as unknown as Compiler);

    expect(compiler.options.loader).toBeUndefined();
  });
});
