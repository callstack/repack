import type { RuleSetRule } from '@rspack/core';
import { getModulePaths } from '../utils/getModulePaths.js';

const makeSwcLoaderConfig = (syntax: 'js' | 'ts', jsx: boolean) => ({
  loader: 'builtin:swc-loader',
  options: {
    env: {
      loose: true,
      targets: { 'react-native': '0.74' },
    },
    jsc: {
      externalHelpers: true,
      loose: true,
      parser:
        syntax === 'js'
          ? { syntax: 'ecmascript', jsx: jsx }
          : { syntax: 'typescript', tsx: jsx },
      transform: {
        react: {
          runtime: 'automatic',
          importSource: 'react-native-css-interop', // ? 'nativewind',
        },
      },
    },
    module: {
      type: 'commonjs',
      strict: false,
      strictMode: false,
      noInterop: false,
    },
  },
});

/**
 * @constant NODE_MODULES_LOADING_RULES
 * @type {RuleSetRule}
 * @description Module rule configuration for loading node_modules, excluding React Native Core & out-of-tree platform packages.
 */
export const NODE_MODULES_LOADING_RULES: RuleSetRule = {
  type: 'javascript/auto',
  test: /\.[cm]?[jt]sx?$/,
  include: [/node_modules/],
  exclude: getModulePaths([
    'react',
    'react-native',
    '@react-native',
    'react-native-macos',
    'react-native-windows',
    'react-native-tvos',
    '@callstack/react-native-visionos',
  ]),
  oneOf: [
    {
      test: /jsx?$/,
      use: [makeSwcLoaderConfig('js', true)],
    },
    {
      test: /ts$/,
      use: [makeSwcLoaderConfig('ts', false)],
    },
    {
      test: /tsx$/,
      use: [makeSwcLoaderConfig('ts', true)],
    },
  ],
};
