import { partitionTransforms } from '../babelSwcLoader.js';

type TransformEntry = [string, Record<string, any> | undefined];

describe('partitionTransforms', () => {
  it('partitions normal, configurable, and custom transforms preserving order', () => {
    const transforms: TransformEntry[] = [
      ['transform-block-scoping', {}],
      ['transform-react-jsx', {}],
      ['transform-object-rest-spread', { loose: true }],
      ['transform-class-properties', { loose: true }], // disabled configurable
      ['transform-private-methods', { loose: true }], // disabled configurable
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
      'transform-object-rest-spread',
      'transform-for-of',
    ]);

    expect(supportedSwcTransforms).toEqual([
      'transform-block-scoping',
      'transform-classes',
      'transform-object-rest-spread',
      'transform-for-of',
      'transform-react-jsx',
      'transform-modules-commonjs',
    ]);
  });

  it('ignores unsupported and disabled transforms (snapshot)', () => {
    const transforms: TransformEntry[] = [
      ['transform-class-properties', { loose: true }], // disabled
      ['transform-private-methods', { loose: true }], // disabled
      ['unknown-plugin', {}],
    ];

    const result = partitionTransforms('/virtual/file.js', transforms);

    expect(result).toMatchSnapshot('unsupported and disabled');
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
});
