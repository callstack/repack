import type { RuleSetRule } from '@rspack/core';
import { getModulePaths } from '../utils/getModulePaths';

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
  rules: [
    {
      test: /\.jsx?$/,
      use: [
        {
          loader: 'builtin:swc-loader',
          options: {
            env: {
              targets: { 'react-native': '0.74' },
            },
            jsc: {
              loose: true,
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
            },
          },
        },
      ],
    },
    {
      test: /\.tsx?$/,
      use: [
        {
          loader: 'builtin:swc-loader',
          options: {
            env: {
              targets: { 'react-native': '0.74' },
            },
            jsc: {
              parser: {
                syntax: 'typescript',
                tsx: true,
              },
              loose: true,
              externalHelpers: true,
            },
            module: {
              type: 'commonjs',
              strict: false,
              strictMode: false,
            },
          },
        },
      ],
    },
  ],
};
