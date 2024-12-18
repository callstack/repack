import type { RuleSetRule } from '@rspack/core';
import { getModulePaths } from '../utils/getModulePaths.ts';
import { REACT_NATIVE_LAZY_IMPORTS } from './lazyImports.ts';

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
          // helpers alter the order of execution and cause weird issues with reanimated
          // this is very likely an SWC issue
          // TODO - investigate and reenable helpers in the future
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
