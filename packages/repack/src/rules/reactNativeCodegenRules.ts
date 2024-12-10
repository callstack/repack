import type { RuleSetRule } from '@rspack/core';

/**
 * @constant REACT_NATIVE_CODEGEN_RULES
 * @type {RuleSetRule}
 * @description Module rule configuration for handling React Native codegen files.
 */
export const REACT_NATIVE_CODEGEN_RULES: RuleSetRule = {
  test: /(?:^|[\\/])(?:Native\w+|(\w+)NativeComponent)\.[jt]sx?$/,
  oneOf: [
    {
      test: /\.ts$/,
      use: [
        {
          loader: 'babel-loader',
          options: {
            babelrc: false,
            configFile: false,
            plugins: [
              [
                '@babel/plugin-syntax-typescript',
                { isTSX: false, allowNamespaces: true },
              ],
              '@react-native/babel-plugin-codegen',
            ],
          },
        },
      ],
    },
    {
      test: /\.tsx$/,
      use: [
        {
          loader: 'babel-loader',
          options: {
            babelrc: false,
            configFile: false,
            plugins: [
              [
                '@babel/plugin-syntax-typescript',
                { isTSX: true, allowNamespaces: true },
              ],
              '@react-native/babel-plugin-codegen',
            ],
          },
        },
      ],
    },
    {
      test: /\.jsx?$/,
      use: [
        {
          loader: 'babel-loader',
          options: {
            babelrc: false,
            configFile: false,
            plugins: [
              'babel-plugin-syntax-hermes-parser',
              '@react-native/babel-plugin-codegen',
            ],
          },
        },
      ],
    },
  ],
  type: 'javascript/auto',
};
