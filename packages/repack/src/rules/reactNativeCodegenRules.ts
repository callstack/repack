import type { RuleSetRule } from '@rspack/core';

export const REACT_NATIVE_CODEGEN_RULES: RuleSetRule = {
  test: /(?:^|[\\/])(?:Native\w+|(\w+)NativeComponent)\.[jt]sx?$/,
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
  type: 'javascript/auto',
};
