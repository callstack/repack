import type { TransformOptions } from '@babel/core';

export const repackBabelPreset: TransformOptions = {
  plugins: [
    ['@babel/plugin-syntax-typescript', false],
    ['@react-native/babel-plugin-codegen', false],
    '@babel/plugin-transform-flow-strip-types',
  ],
  overrides: [
    {
      test: /(?:^|[\\/])(?:Native\w+|(\w+)NativeComponent)\.[jt]sx?$/,
      plugins: ['@react-native/babel-plugin-codegen'],
    },
    {
      test: /\.ts$/,
      plugins: [
        [
          '@babel/plugin-syntax-typescript',
          { isTSX: false, allowNamespaces: true },
        ],
      ],
    },
    {
      test: /\.tsx$/,
      plugins: [
        [
          '@babel/plugin-syntax-typescript',
          { isTSX: true, allowNamespaces: true },
        ],
      ],
    },
  ],
};
