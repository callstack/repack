import type { RuleSetRule } from '@rspack/core';
import { REACT_NATIVE_LAZY_IMPORTS } from './lazyImports';

export const REACT_NATIVE_LOADING_RULES: RuleSetRule = {
  type: 'javascript/dynamic',
  test: /\.jsx?$/,
  include: [
    // classic paths
    /node_modules([/\\])+react-native[/\\]/,
    /node_modules([/\\])+@react-native[/\\]/,
    // classic paths for OOT
    /node_modules([/\\])+react-native-macos[/\\]/,
    /node_modules([/\\])+react-native-windows[/\\]/,
    /node_modules([/\\])+react-native-tvos[/\\]/,
    /node_modules([/\\])+@callstack[/\\]react-native-visionos[/\\]/,
    // exotic paths (e.g. pnpm)
    /node_modules(.*[/\\])+react-native@/,
    /node_modules(.*[/\\])+@react-native\+/,
    // exotic paths for OOT
    /node_modules(.*[/\\])+react-native-macos@/,
    /node_modules(.*[/\\])+react-native-windows@/,
    /node_modules(.*[/\\])+react-native-tvos@/,
    /node_modules(.*[/\\])+@callstack\+react-native-visionos@/,
  ],
  use: [
    {
      loader: 'builtin:swc-loader',
      options: {
        env: {
          targets: { 'react-native': '0.74' },
        },
        jsc: {
          parser: {
            syntax: 'ecmascript',
            jsx: true,
            exportDefaultFrom: true,
          },
          loose: true,
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
      loader: '@callstack/repack/flow-loader',
      options: { all: true },
    },
  ],
};
