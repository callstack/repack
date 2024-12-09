import type { RuleSetRule } from '@rspack/core';
import { getModulePaths } from '../utils';
import { REACT_NATIVE_LAZY_IMPORTS } from './lazyImports';

/**
 * @constant REACT_NATIVE_LOADING_RULES
 * @type {RuleSetRule}
 * @description Module rule configuration for loading React Native Core & out-of-tree platform packages.
 */
export const REACT_NATIVE_LOADING_RULES: RuleSetRule = {
  type: 'javascript/dynamic',
  test: /\.jsx?$/,
  include: getModulePaths([
    'react-native',
    '@react-native',
    'react-native-macos',
    'react-native-windows',
    'react-native-tvos',
    '@callstack/react-native-visionos',
  ]),
  use: [
    {
      loader: 'builtin:swc-loader',
      options: {
        env: {
          targets: { 'react-native': '0.74' },
        },
        jsc: {
          externalHelpers: false,
          loose: true,
          parser: {
            syntax: 'ecmascript',
            jsx: true,
            exportDefaultFrom: true,
          },
          transform: {
            react: {
              runtime: 'automatic',
            },
          },
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
