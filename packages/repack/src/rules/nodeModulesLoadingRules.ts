import type { RuleSetRule } from '@rspack/core';

export const NODE_MODULES_LOADING_RULES: RuleSetRule = {
  type: 'javascript/auto',
  test: /\.[cm]?[jt]sx?$/,
  include: [/node_modules/],
  exclude: [
    // classic paths
    /node_modules([/\\])+react[/\\]/,
    /node_modules([/\\])+react-native[/\\]/,
    /node_modules([/\\])+@react-native[/\\]/,
    // classic paths for OOT
    /node_modules([/\\])+react-native-macos[/\\]/,
    /node_modules([/\\])+react-native-windows[/\\]/,
    /node_modules([/\\])+react-native-tvos[/\\]/,
    /node_modules([/\\])+@callstack[/\\]react-native-visionos[/\\]/,
    // exotic paths (e.g. pnpm)
    /node_modules(.*[/\\])+react@/,
    /node_modules(.*[/\\])+react-native@/,
    /node_modules(.*[/\\])+@react-native\+/,
    // exotic paths for OOT
    /node_modules(.*[/\\])+react-native-macos@/,
    /node_modules(.*[/\\])+react-native-windows@/,
    /node_modules(.*[/\\])+react-native-tvos@/,
    /node_modules(.*[/\\])+@callstack\+react-native-visionos@/,
  ],
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
