import { getExtraBabelPlugins } from '../utils.js';

const syntaxTypeScriptPlugin = require.resolve(
  '@babel/plugin-syntax-typescript'
);

describe('getExtraBabelPlugins', () => {
  it('adds the resolved TS syntax plugin for .ts files', () => {
    expect(getExtraBabelPlugins('/virtual/file.ts')).toEqual([
      [syntaxTypeScriptPlugin, { isTSX: false, allowNamespaces: true }],
    ]);
  });

  it('adds the resolved TSX syntax plugin for .tsx files', () => {
    expect(getExtraBabelPlugins('/virtual/file.tsx')).toEqual([
      [syntaxTypeScriptPlugin, { isTSX: true, allowNamespaces: true }],
    ]);
  });

  it('adds no plugins for other files', () => {
    expect(getExtraBabelPlugins('/virtual/file.js')).toEqual([]);
  });
});
