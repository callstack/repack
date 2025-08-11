import type { SwcLoaderOptions } from '@rspack/core';
import {
  getSupportedSwcConfigurableTransforms,
  getSupportedSwcCustomTransforms,
  getSupportedSwcNormalTransforms,
} from '../swc.js';

type TransformEntry = [string, Record<string, any> | undefined];

describe('swc transforms support detection', () => {
  describe('getSupportedSwcNormalTransforms', () => {
    it('returns only supported normal transform names preserving order', () => {
      const transforms: TransformEntry[] = [
        ['transform-block-scoping', undefined],
        ['transform-classes', {}],
        ['transform-react-jsx', undefined], // custom
        ['transform-private-methods', undefined], // configurable (disabled)
        ['unknown-plugin', undefined],
        ['transform-object-rest-spread', undefined], // configurable
      ];

      const result = getSupportedSwcNormalTransforms(transforms);

      expect(result).toEqual(['transform-block-scoping', 'transform-classes']);
    });
  });

  describe('getSupportedSwcConfigurableTransforms', () => {
    it('returns only supported configurable transform names preserving order', () => {
      const baseSwcConfig = {};
      const transforms: TransformEntry[] = [
        ['transform-class-properties', { loose: true }], // disabled
        ['transform-private-methods', { loose: true }], // disabled
        ['transform-private-property-in-object', {}],
        ['transform-object-rest-spread', {}],
        ['transform-optional-chaining', {}],
        ['transform-nullish-coalescing-operator', {}],
        ['transform-for-of', {}],
        ['transform-runtime', {}], // custom
        ['transform-block-scoping', {}], // normal
        ['unknown-plugin', {}],
      ];

      const { transformNames } = getSupportedSwcConfigurableTransforms(
        transforms,
        baseSwcConfig as SwcLoaderOptions
      );

      expect(transformNames).toEqual([
        'transform-private-property-in-object',
        'transform-object-rest-spread',
        'transform-optional-chaining',
        'transform-nullish-coalescing-operator',
        'transform-for-of',
      ]);
    });
  });

  describe('getSupportedSwcCustomTransforms', () => {
    it('returns only supported custom transform names preserving order', () => {
      const baseSwcConfig = {};
      const transforms: TransformEntry[] = [
        ['transform-runtime', {}],
        [
          'transform-react-jsx',
          { runtime: 'automatic', importSource: 'react' },
        ],
        ['transform-react-jsx-self', {}],
        ['transform-react-jsx-source', {}],
        ['transform-modules-commonjs', {}],
        ['proposal-export-default-from', {}],
        ['transform-block-scoping', {}], // normal
        ['transform-private-methods', {}], // configurable (disabled)
        ['unknown-plugin', {}],
      ];

      const { transformNames } = getSupportedSwcCustomTransforms(
        transforms,
        baseSwcConfig as SwcLoaderOptions
      );

      expect(transformNames).toEqual([
        'transform-runtime',
        'transform-react-jsx',
        'transform-react-jsx-self',
        'transform-react-jsx-source',
        'transform-modules-commonjs',
        'proposal-export-default-from',
      ]);
    });
  });
});
