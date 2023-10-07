import type { RuleSetRule } from '@rspack/core';

export const NODE_MODULES_MODULE_RULES: RuleSetRule = {
  test: /\.[jt]sx?$/,
  include: [/node_modules/],
  exclude: [
    /node_modules(.*[/\\])+react\//,
    /node_modules(.*[/\\])+react-native/,
    /node_modules(.*[/\\])+@react-native/,
  ],
  use: [
    {
      loader: 'builtin:swc-loader',
      options: {
        jsc: {
          target: 'es5',
          externalHelpers: true,
        },
        module: {
          type: 'commonjs',
          strict: false,
          strictMode: true,
          noInterop: false,
        },
      },
    },
  ],
};
