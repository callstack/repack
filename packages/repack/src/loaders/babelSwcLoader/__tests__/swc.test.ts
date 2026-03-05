import { experiments, type SwcLoaderOptions } from '@rspack/core';
import {
  addSwcComplementaryTransforms,
  getSupportedSwcConfigurableTransforms,
  getSupportedSwcCustomTransforms,
  getSupportedSwcNormalTransforms,
} from '../swc.js';
import {
  buildFinalSwcConfig,
  partitionTransforms,
} from '../babelSwcLoader.js';

type TransformEntry = [string, Record<string, any> | undefined];

describe('swc transforms support detection', () => {
  describe('addSwcComplementaryTransforms', () => {
    it('adds transform-class-static-block when transform-class-properties is present', () => {
      const transforms: TransformEntry[] = [
        ['transform-class-properties', { loose: true }],
      ];

      const result = addSwcComplementaryTransforms(transforms);

      expect(result).toEqual([
        ['transform-class-properties', { loose: true }],
        ['transform-class-static-block', undefined],
      ]);
    });

    it('adds transform-object-rest-spread when transform-destructuring is present', () => {
      const transforms: TransformEntry[] = [['transform-destructuring', {}]];

      const result = addSwcComplementaryTransforms(transforms);

      expect(result).toEqual([
        ['transform-destructuring', {}],
        ['transform-object-rest-spread', undefined],
      ]);
    });

    it('does not duplicate already included complementary transforms', () => {
      const transforms: TransformEntry[] = [
        ['transform-class-properties', { loose: true }],
        ['transform-class-static-block', {}],
        ['transform-destructuring', {}],
        ['transform-object-rest-spread', { loose: true }],
      ];

      const result = addSwcComplementaryTransforms(transforms);

      expect(result).toEqual(transforms);
    });
  });

  describe('getSupportedSwcNormalTransforms', () => {
    it('returns only supported normal transform names preserving order', () => {
      const transforms: TransformEntry[] = [
        ['transform-block-scoping', undefined],
        ['transform-classes', {}],
        ['transform-react-jsx', undefined], // custom
        ['transform-private-methods', undefined], // configurable
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
        ['transform-class-properties', { loose: true }],
        ['transform-private-methods', { loose: true }],
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
        'transform-class-properties',
        'transform-private-methods',
        'transform-private-property-in-object',
        'transform-object-rest-spread',
        'transform-optional-chaining',
        'transform-nullish-coalescing-operator',
        'transform-for-of',
      ]);
    });

    it('sets class fields and private methods assumptions explicitly in loose mode', () => {
      const { swcConfig } = getSupportedSwcConfigurableTransforms(
        [
          ['transform-class-properties', { loose: true }],
          ['transform-private-methods', { loose: true }],
        ],
        {} as SwcLoaderOptions
      );

      expect(swcConfig.jsc?.assumptions).toEqual({
        setPublicClassFields: true,
        privateFieldsAsProperties: true,
      });
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

    it('updates both privateFieldsAsProperties and setPublicClassFields for private-property-in-object but does not override explicit true', () => {
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

      expect(transformNames).toEqual(['transform-private-property-in-object']);
      expect(swcConfig.jsc?.assumptions).toEqual({
        privateFieldsAsProperties: true,
        setPublicClassFields: true,
      });
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

    it('should apply default react transform when plugin has no react transform options', () => {
      const inputConfig: SwcLoaderOptions = {
        jsc: {
          transform: { react: {} },
        },
      };
      const { swcConfig } = getSupportedSwcCustomTransforms(
        [['transform-react-jsx', {}]],
        inputConfig
      );

      expect(swcConfig.jsc?.transform?.react).toEqual({
        runtime: 'automatic',
        importSource: 'react',
      });
    });

    it('should preserve existing react transform config when plugin has none', () => {
      const inputConfig: SwcLoaderOptions = {
        jsc: {
          transform: {
            react: { runtime: 'automatic', importSource: 'nativewind' },
          },
        },
      };
      const { swcConfig } = getSupportedSwcCustomTransforms(
        [['transform-react-jsx', {}]],
        inputConfig
      );

      expect(swcConfig.jsc?.transform?.react).toEqual({
        runtime: 'automatic',
        importSource: 'nativewind',
      });
    });

    it('should use plugin importSource option for react transform', () => {
      const inputConfig: SwcLoaderOptions = {
        jsc: {
          transform: {
            react: {},
          },
        },
      };
      const { swcConfig } = getSupportedSwcCustomTransforms(
        [
          [
            'transform-react-jsx',
            { runtime: 'automatic', importSource: 'nativewind' },
          ],
        ],
        inputConfig
      );

      expect(swcConfig.jsc?.transform?.react).toEqual({
        runtime: 'automatic',
        importSource: 'nativewind',
      });
    });

    it('should use plugin importSource option for react transform and override existing importSource', () => {
      const inputConfig: SwcLoaderOptions = {
        jsc: {
          transform: {
            react: { importSource: 'preact' },
          },
        },
      };
      const { swcConfig } = getSupportedSwcCustomTransforms(
        [
          [
            'transform-react-jsx',
            { runtime: 'automatic', importSource: 'nativewind' },
          ],
        ],
        inputConfig
      );

      expect(swcConfig.jsc?.transform?.react).toEqual({
        runtime: 'automatic',
        importSource: 'nativewind',
      });
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

  describe('real swc transform regression', () => {
    it('compiles loose class properties and private methods with complementary static block support', () => {
      const source = `
        class Example {
          static value = 1;
          static {
            this.value += 1;
          }

          #count = 0;

          #increment() {
            this.#count += 1;
          }

          run() {
            this.#increment();
            return this.#count;
          }
        }

        export default new Example().run();
      `;

      const { includedSwcTransforms, swcConfig } = partitionTransforms(
        '/virtual/file.js',
        [
          ['transform-class-properties', { loose: true }],
          ['transform-private-methods', { loose: true }],
        ]
      );
      const finalSwcConfig = buildFinalSwcConfig({
        swcConfig,
        includedSwcTransforms,
        lazyImports: false,
        sourceType: 'module',
      });

      const result = experiments.swc.transformSync(source, {
        ...finalSwcConfig,
        filename: '/virtual/file.js',
        configFile: false,
        swcrc: false,
        sourceMaps: false,
      });

      expect(result.code).not.toContain('static {');
      expect(result.code).not.toContain('#count');
    });
  });
});
