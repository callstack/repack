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
});
