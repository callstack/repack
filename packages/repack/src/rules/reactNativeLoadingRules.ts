import type { RuleSetRule } from '@rspack/core';
import { REACT_NATIVE_LAZY_IMPORTS } from './lazyImports';

export const REACT_NATIVE_LOADING_RULES: RuleSetRule = {
  test: /\.jsx?$/,
  include: [
    /node_modules(.*[/\\])+react-native/,
    /node_modules(.*[/\\])+@react-native/,
  ],
  use: [
    {
      loader: 'builtin:swc-loader',
      options: {
        env: {
          targets: 'Hermes >= 0.11',
          include: [
            'transform-arrow-functions',
            'transform-block-scoping',
            'transform-classes',
            'transform-destructuring',
            'transform-unicode-regex',
          ],
        },
        jsc: {
          parser: {
            syntax: 'ecmascript',
            jsx: true,
          },
          externalHelpers: true,
        },
        module: {
          type: 'commonjs',
          strict: false,
          strictMode: false,
          lazy: REACT_NATIVE_LAZY_IMPORTS,
        },
      },
    },
    { loader: '@callstack/repack/flow-strip-types-loader' },
  ],
};
