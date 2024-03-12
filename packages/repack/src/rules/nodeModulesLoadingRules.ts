import type { RuleSetRule } from '@rspack/core';

export const NODE_MODULES_LOADING_RULES: RuleSetRule = {
  test: /\.[cm]?[jt]sx?$/,
  include: [/node_modules/],
  exclude: [
    // /node_modules(.*[/\\])+react\//,
    /node_modules(.*[/\\])+react-native/,
    /node_modules(.*[/\\])+@react-native/,
  ],
  use: [
    {
      loader: 'builtin:swc-loader',
      options: {
        env: {
          targets: 'Hermes >= 0.11',
          include: [
            'transform-arrow-functions',
            'transform-block-scoping',
            'transform-classes',
            'transform-destructuring',
            'transform-unicode-regex',
          ],
        },
        jsc: { externalHelpers: true },
        module: {
          type: 'commonjs',
          strict: false,
          strictMode: false,
        },
      },
    },
  ],
};
