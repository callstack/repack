import { transform } from '../babelLoader.js';
import { parseReactNativeSource } from '../utils.js';

jest.mock('../utils.js', () => {
  const actual = jest.requireActual('../utils.js');
  const { parseSync } = require('@babel/core');
  return {
    ...actual,
    parseReactNativeSource: jest.fn(
      async (
        src: string,
        opts: { sourceType?: 'script' | 'module' | 'unambiguous' | null }
      ) =>
        parseSync(src, {
          sourceType: opts?.sourceType ?? 'unambiguous',
          // the stand-in parser runs outside of a file context, so skip config lookup
          filename: '/virtual/hermes-parser-stand-in.js',
          babelrc: false,
          configFile: false,
        })
    ),
  };
});

const baseTransformOptions = (filename: string) => ({
  caller: { name: 'jest-babel-loader-test' },
  filename,
  sourceMaps: false,
  sourceFileName: filename,
  sourceRoot: '/virtual',
  envName: 'production',
});

describe('babelLoader', () => {
  describe('parser selection', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('skips hermes-parser for sources without an @flow pragma', async () => {
      await transform(
        'export const answer = 42;',
        baseTransformOptions('/virtual/plain.js')
      );

      expect(parseReactNativeSource).not.toHaveBeenCalled();
    });

    it('uses hermes-parser for sources with an @flow pragma', async () => {
      await transform(
        '// @flow\nexport const answer = 42;',
        baseTransformOptions('/virtual/flow.js')
      );

      expect(parseReactNativeSource).toHaveBeenCalled();
    });

    it('uses hermes-parser for every source when flow is set to all', async () => {
      await transform(
        'export const answer = 42;',
        baseTransformOptions('/virtual/plain.js'),
        { hermesParserOverrides: { flow: 'all' } }
      );

      expect(parseReactNativeSource).toHaveBeenCalled();
    });

    it('skips hermes-parser for TypeScript sources', async () => {
      await transform(
        '// @flow\nexport const answer: number = 42;',
        baseTransformOptions('/virtual/typescript.ts')
      );

      expect(parseReactNativeSource).not.toHaveBeenCalled();
    });
  });

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
