import type { RuleSetRule } from '@rspack/core';
import { REACT_NATIVE_LAZY_IMPORTS } from './lazyImports';

export const REACT_NATIVE_LOADING_RULES: RuleSetRule = {
  test: /\.jsx?$/,
  include: [
    // classic paths
    /node_modules(.*[/\\])+react-native[/\\]/,
    /node_modules(.*[/\\])+@react-native[/\\]/,
    // exotic paths (pnpm)
    /node_modules(.*[/\\])+react-native@/,
    /node_modules(.*[/\\])+@react-native\+/,
  ],
  use: [
    {
      loader: 'builtin:swc-loader',
      options: {
        env: {
          targets: { hermes: '0.12' },
        },
        jsc: {
          parser: {
            syntax: 'ecmascript',
            jsx: true,
            exportDefaultFrom: true,
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
    {
      loader: '@callstack/repack/flow-strip-types-loader',
    },
  ],
  type: 'javascript/auto',
};
