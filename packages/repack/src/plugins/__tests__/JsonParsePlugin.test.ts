import type { Compiler } from '@rspack/core';
import { JsonParsePlugin } from '../JsonParsePlugin.js';

function createCompiler(
  bundler: { rspackVersion: string } | { version: string },
  generator?: Record<string, unknown>
) {
  const warn = jest.fn();
  const compiler = {
    webpack: bundler,
    options: { module: { generator } },
    getInfrastructureLogger: () => ({ warn }),
  };
  return { compiler: compiler as unknown as Compiler, warn };
}

describe('JsonParsePlugin', () => {
  it('sets JSONParse on Rspack 1.3.0+', () => {
    const { compiler, warn } = createCompiler({ rspackVersion: '1.3.0' });

    new JsonParsePlugin(false).apply(compiler);

    expect(compiler.options.module.generator).toEqual({
      json: { JSONParse: false },
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it('sets JSONParse on webpack 5.99.0+', () => {
    const { compiler } = createCompiler({ version: '5.99.0' });

    new JsonParsePlugin(false).apply(compiler);

    expect(compiler.options.module.generator).toEqual({
      json: { JSONParse: false },
    });
  });

  it('keeps other generator options', () => {
    const { compiler } = createCompiler(
      { rspackVersion: '2.0.0' },
      { asset: { dataUrl: {} } }
    );

    new JsonParsePlugin(false).apply(compiler);

    expect(compiler.options.module.generator).toEqual({
      asset: { dataUrl: {} },
      json: { JSONParse: false },
    });
  });

  it('keeps JSONParse set by the user', () => {
    const { compiler } = createCompiler(
      { rspackVersion: '2.0.0' },
      { json: { JSONParse: true } }
    );

    new JsonParsePlugin(false).apply(compiler);

    expect(compiler.options.module.generator).toEqual({
      json: { JSONParse: true },
    });
  });

  it('warns and does nothing on Rspack older than 1.3.0', () => {
    const { compiler, warn } = createCompiler({ rspackVersion: '1.2.8' });

    new JsonParsePlugin(false).apply(compiler);

    expect(compiler.options.module.generator).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Rspack 1.3.0'));
  });

  it('warns and does nothing on webpack older than 5.99.0', () => {
    const { compiler, warn } = createCompiler({ version: '5.98.0' });

    new JsonParsePlugin(false).apply(compiler);

    expect(compiler.options.module.generator).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('webpack 5.99.0')
    );
  });
});
