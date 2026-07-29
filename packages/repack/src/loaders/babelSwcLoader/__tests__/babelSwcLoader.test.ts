import { buildFinalSwcConfig, partitionTransforms } from '../babelSwcLoader.js';

type TransformEntry = [string, Record<string, any> | undefined];

describe('partitionTransforms', () => {
  it('partitions normal, configurable, and custom transforms preserving order', () => {
    const transforms: TransformEntry[] = [
      ['transform-block-scoping', {}],
      ['transform-react-jsx', {}],
      ['transform-object-rest-spread', { loose: true }],
      ['transform-class-properties', { loose: true }],
      ['transform-private-methods', { loose: true }],
      ['unknown-plugin', {}],
      ['transform-modules-commonjs', {}],
      ['transform-classes', {}],
      ['transform-for-of', {}],
    ];

    const { includedSwcTransforms, supportedSwcTransforms } =
      partitionTransforms('/virtual/file.tsx', transforms);

    expect(includedSwcTransforms).toEqual([
      'transform-block-scoping',
      'transform-classes',
      'transform-class-static-block',
      'transform-object-rest-spread',
      'transform-class-properties',
      'transform-private-methods',
      'transform-for-of',
    ]);

    expect(supportedSwcTransforms).toEqual([
      'transform-block-scoping',
      'transform-classes',
      'transform-class-static-block',
      'transform-object-rest-spread',
      'transform-class-properties',
      'transform-private-methods',
      'transform-for-of',
      'transform-react-jsx',
      'transform-modules-commonjs',
    ]);
  });

  it('ignores unsupported transforms (snapshot)', () => {
    const transforms: TransformEntry[] = [
      ['transform-class-properties', { loose: true }],
      ['transform-private-methods', { loose: true }],
      ['unknown-plugin', {}],
    ];

    const result = partitionTransforms('/virtual/file.js', transforms);

    expect(result).toMatchSnapshot('unsupported only');
  });

  it('only custom transforms are excluded from included set but present in supported set (snapshot)', () => {
    const transforms: TransformEntry[] = [
      ['transform-react-jsx', {}],
      ['transform-modules-commonjs', {}],
      ['proposal-export-default-from', {}],
    ];

    const result = partitionTransforms('/virtual/file.jsx', transforms);

    expect(result).toMatchSnapshot('custom-only supported set');
  });

  it('returns empty arrays when no transforms are specified (snapshot)', () => {
    const result = partitionTransforms('/virtual/empty.ts', []);

    expect(result).toMatchSnapshot('empty arrays');
  });

  it('adds transform-object-rest-spread when transform-destructuring is present', () => {
    const transforms: TransformEntry[] = [
      ['transform-destructuring', {}],
      ['transform-react-jsx', {}],
    ];

    const { includedSwcTransforms, supportedSwcTransforms } =
      partitionTransforms('/virtual/file.js', transforms);

    expect(includedSwcTransforms).toEqual([
      'transform-destructuring',
      'transform-object-rest-spread',
    ]);
    expect(supportedSwcTransforms).toEqual([
      'transform-destructuring',
      'transform-object-rest-spread',
      'transform-react-jsx',
    ]);
  });

  it('adds transform-class-static-block when transform-class-properties is present', () => {
    const transforms: TransformEntry[] = [
      ['transform-class-properties', { loose: true }],
      ['transform-react-jsx', {}],
    ];

    const { includedSwcTransforms, supportedSwcTransforms } =
      partitionTransforms('/virtual/file.js', transforms);

    expect(includedSwcTransforms).toEqual([
      'transform-class-static-block',
      'transform-class-properties',
    ]);
    expect(supportedSwcTransforms).toEqual([
      'transform-class-static-block',
      'transform-class-properties',
      'transform-react-jsx',
    ]);
  });
});

describe('buildFinalSwcConfig', () => {
  it('uses module.type from swcConfig when transform-modules-commonjs is present', () => {
    const result = buildFinalSwcConfig({
      swcConfig: { module: { type: 'commonjs' } },
      includedSwcTransforms: [],
      lazyImports: false,
      sourceType: 'module',
    });

    expect(result.module?.type).toBe('commonjs');
  });

  it('falls back to es6 module.type when transform-modules-commonjs is not present', () => {
    const result = buildFinalSwcConfig({
      swcConfig: {},
      includedSwcTransforms: [],
      lazyImports: false,
      sourceType: 'module',
    });

    expect(result.module?.type).toBe('es6');
  });
});
