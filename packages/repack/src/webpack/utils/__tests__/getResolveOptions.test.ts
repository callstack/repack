import os from 'node:os';
import { getResolveOptions } from '../getResolveOptions';

describe('getResolveOptions', () => {
  it('should include extensions in order like in Metro', () => {
    jest.spyOn(os, 'platform').mockReturnValueOnce('darwin');

    const extensions = getResolveOptions('android').extensions;
    expect(extensions).toEqual([
      '.android.js',
      '.native.js',
      '.js',
      '.android.jsx',
      '.native.jsx',
      '.jsx',
      `.android.json`,
      '.native.json',
      '.json',
      '.android.ts',
      '.native.ts',
      '.ts',
      '.android.tsx',
      '.native.tsx',
      '.tsx',
    ]);
  });

  it('should include .json extensions last on Windows', () => {
    jest.spyOn(os, 'platform').mockReturnValueOnce('win32');

    const extensions = getResolveOptions('android').extensions;
    expect(extensions).toEqual([
      '.android.js',
      '.native.js',
      '.js',
      '.android.jsx',
      '.native.jsx',
      '.jsx',
      '.android.ts',
      '.native.ts',
      '.ts',
      '.android.tsx',
      '.native.tsx',
      '.tsx',
      `.android.json`,
      '.native.json',
      '.json',
    ]);
  });
});
