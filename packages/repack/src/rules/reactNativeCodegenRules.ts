import type { RuleSetRule } from '@rspack/core';

/**
 * @constant REACT_NATIVE_CODEGEN_RULES
 * @type {RuleSetRule}
 * @description Module rule configuration for handling React Native codegen files.
 */
export const REACT_NATIVE_CODEGEN_RULES: RuleSetRule = {
  test: /(?:^|[\\/])(?:Native\w+|(\w+)NativeComponent)\.[jt]sx?$/,
  rules: [
    {
      test: /\.tsx?$/,
      use: [
        {
          loader: 'babel-loader',
          options: {
            babelrc: false,
            browserslistConfigFile: false,
            configFile: false,
            compact: false,
            plugins: [
              '@babel/plugin-syntax-typescript',
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
            browserslistConfigFile: false,
            configFile: false,
            compact: false,
            plugins: [
              '@babel/plugin-syntax-flow',
              '@react-native/babel-plugin-codegen',
            ],
          },
        },
      ],
    },
  ],
  type: 'javascript/auto',
};
