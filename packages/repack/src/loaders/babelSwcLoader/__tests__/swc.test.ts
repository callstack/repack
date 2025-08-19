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

    it('applies loose mode to setSpreadProperties when not defined; preserves explicit true (snapshot)', () => {
      const baseUndefined = {} as SwcLoaderOptions;
      const { swcConfig: cfg1 } = getSupportedSwcConfigurableTransforms(
        [['transform-object-rest-spread', { loose: true }]],
        baseUndefined
      );

      expect(cfg1.jsc?.assumptions).toMatchSnapshot(
        'object-rest-spread loose: setSpreadProperties'
      );

      const baseTrue: SwcLoaderOptions = {
        jsc: { assumptions: { setSpreadProperties: true } },
      } as SwcLoaderOptions;
      const { swcConfig: cfg2 } = getSupportedSwcConfigurableTransforms(
        [['transform-object-rest-spread', { loose: false }]],
        baseTrue
      );

      expect(cfg2.jsc?.assumptions).toMatchSnapshot(
        'object-rest-spread explicit true preserved'
      );
    });

    it('sets optional-chaining/nullish and for-of assumptions with loose mode and respects explicit values (snapshot)', () => {
      const base: SwcLoaderOptions = {
        jsc: { assumptions: { noDocumentAll: true } },
      } as SwcLoaderOptions;

      const { swcConfig } = getSupportedSwcConfigurableTransforms(
        [
          ['transform-optional-chaining', { loose: false }],
          ['transform-nullish-coalescing-operator', { loose: true }],
          ['transform-for-of', { loose: true }],
        ],
        base
      );

      expect(swcConfig.jsc?.assumptions).toMatchSnapshot(
        'optional-chaining/nullish and for-of assumptions'
      );
    });

    it('updates both privateFieldsAsProperties and setPublicClassFields for private-property-in-object but does not override explicit true (snapshot)', () => {
      const base: SwcLoaderOptions = {
        jsc: {
          assumptions: {
            privateFieldsAsProperties: true,
            setPublicClassFields: true,
          },
        },
      } as SwcLoaderOptions;

      const { swcConfig, transformNames } =
        getSupportedSwcConfigurableTransforms(
          [['transform-private-property-in-object', { loose: false }]],
          base
        );

      expect({
        transformNames,
        assumptions: swcConfig.jsc?.assumptions,
      }).toMatchSnapshot('private-property-in-object assumptions and names');
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

    it('overrides react runtime and importSource from transform-react-jsx config (snapshot)', () => {
      const inputConfig: SwcLoaderOptions = {
        jsc: {
          transform: { react: { runtime: 'classic', importSource: 'preact' } },
        },
      };
      const { swcConfig } = getSupportedSwcCustomTransforms(
        [
          [
            'transform-react-jsx',
            { runtime: 'automatic', importSource: 'react/jsx' },
          ],
        ],
        inputConfig
      );

      expect(swcConfig.jsc?.transform?.react).toMatchSnapshot(
        'react runtime override'
      );
    });

    it('configures modules commonjs options based on provided config (snapshot)', () => {
      const inputConfig: SwcLoaderOptions = {};
      const { swcConfig } = getSupportedSwcCustomTransforms(
        [
          [
            'transform-modules-commonjs',
            { strict: false, strictMode: true, allowTopLevelThis: false },
          ],
        ],
        inputConfig
      );
      expect(swcConfig.module).toMatchSnapshot('modules commonjs config');
    });

    it('enables external helpers via transform-runtime (snapshot)', () => {
      const inputConfig: SwcLoaderOptions = {};
      const { swcConfig } = getSupportedSwcCustomTransforms(
        [['transform-runtime', {}]],
        inputConfig
      );
      expect(swcConfig.jsc).toMatchSnapshot('runtime externalHelpers');
    });

    it('sets exportDefaultFrom only for ecmascript parser; leaves typescript parser unchanged (snapshot)', () => {
      const inputConfigTs: SwcLoaderOptions = {
        jsc: { parser: { syntax: 'typescript' } },
      } as SwcLoaderOptions;

      const { swcConfig: tsCfg } = getSupportedSwcCustomTransforms(
        [['proposal-export-default-from', {}]],
        inputConfigTs
      );
      expect(tsCfg.jsc?.parser).toMatchSnapshot('parser: typescript unchanged');

      const inputConfigEcma: SwcLoaderOptions = {
        jsc: { parser: { syntax: 'ecmascript' } },
      } as SwcLoaderOptions;
      const { swcConfig: ecmaCfg } = getSupportedSwcCustomTransforms(
        [['proposal-export-default-from', {}]],
        inputConfigEcma
      );
      expect(ecmaCfg.jsc?.parser).toMatchSnapshot(
        'parser: ecmascript with exportDefaultFrom'
      );
    });
  });
});
