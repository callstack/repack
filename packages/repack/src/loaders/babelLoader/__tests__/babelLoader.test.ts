import { transform } from '../babelLoader.js';

jest.mock('../utils.js', () => {
  const actual = jest.requireActual('../utils.js');
  const { parseSync } = require('@babel/core');
  return {
    ...actual,
    loadHermesParser: jest.fn(async () => ({
      parse: (
        src: string,
        opts: { sourceType?: 'script' | 'module' | 'unambiguous' }
      ) =>
        parseSync(src, {
          sourceType: opts?.sourceType ?? 'unambiguous',
        }),
    })),
  };
});

describe('babelLoader', () => {
  describe('includePlugins', () => {
    it('includes @babel/plugin-transform-react-jsx and transforms JSX', async () => {
      const src = 'export const Component = () => <View test={1} />;';

      const result = await transform(
        src,
        {
          caller: { name: 'jest-babel-loader-test' },
          filename: '/virtual/Component.tsx',
          sourceMaps: false,
          sourceFileName: '/virtual/Component.tsx',
          sourceRoot: '/virtual',
          envName: 'production',
        },
        {
          includePlugins: [
            [
              '@babel/plugin-transform-react-jsx',
              { runtime: 'automatic', importSource: 'react' },
            ],
          ],
        }
      );

      expect(result.code).toMatchSnapshot();
    });
  });

  describe('excludePlugins', () => {
    const esmSrc = 'import foo from "bar"; export default foo;';

    it('by default transforms ESM modules to CJS (baseline)', async () => {
      const result = await transform(esmSrc, {
        caller: { name: 'jest-babel-loader-test' },
        filename: '/virtual/esm.ts',
        sourceMaps: false,
        sourceFileName: '/virtual/esm.ts',
        sourceRoot: '/virtual',
        envName: 'production',
      });

      expect(result.code).toMatchSnapshot();
    });

    it('excludes transform-modules-commonjs so ESM stays intact', async () => {
      const result = await transform(
        esmSrc,
        {
          caller: { name: 'jest-babel-loader-test' },
          filename: '/virtual/esm.ts',
          sourceMaps: false,
          sourceFileName: '/virtual/esm.ts',
          sourceRoot: '/virtual',
          envName: 'production',
        },
        { excludePlugins: ['transform-modules-commonjs'] }
      );

      expect(result.code).toMatchSnapshot();
    });
  });
});
