import type { RuleSetRule } from '@rspack/core';

/**
 * Target: hermes 0.12 Included transforms:
 * - transform-class-static-block: true
 * - transform-class-properties: true
 * - transform-private-property-in-object: true
 * - transform-logical-assignment-operators: true
 * - transform-export-namespace-from: true
 * - transform-nullish-coalescing-operator: true
 * - transform-optional-chaining: true
 * - transform-optional-catch-binding: true
 * - transform-object-rest-spread: true
 * - transform-async-to-generator: true
 * - transform-exponentiation-operator: true
 * - transform-block-scoped-functions: true
 * - transform-template-literals: true
 * - transform-classes: true
 * - transform-spread: true
 * - transform-object-super: true
 * - transform-function-name: true
 * - transform-shorthand-properties: true
 * - transform-parameters: true
 * - transform-arrow-functions: true
 * - transform-duplicate-keys: true
 * - transform-sticky-regex: true
 * - transform-typeof-symbol: true
 * - transform-for-of: true
 * - transform-computed-properties: true
 * - transform-destructuring: true
 * - transform-block-scoping: true
 * - transform-regenerator: true
 * - transform-new-target: true
 * - transform-property-literals: true
 * - transform-member-expression-literals: true
 * - transform-reserved-words: true
 */

export const NODE_MODULES_LOADING_RULES: RuleSetRule = {
  test: /\.[cm]?[jt]sx?$/,
  include: [/node_modules/],
  exclude: [
    // classic paths
    /node_modules(.*[/\\])+react[/\\]/,
    /node_modules(.*[/\\])+react-native[/\\]/,
    /node_modules(.*[/\\])+@react-native[/\\]/,
    // classic paths for OOT
    /node_modules(.*[/\\])+react-native-macos[/\\]/,
    /node_modules(.*[/\\])+react-native-windows[/\\]/,
    /node_modules(.*[/\\])+react-native-tvos[/\\]/,
    /node_modules(.*[/\\])+@callstack[/\\]react-native-visionos[/\\]/,
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
  use: [
    {
      loader: 'builtin:swc-loader',
      options: {
        env: {
          targets: { 'react-native': '0.74' },
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
  type: 'javascript/auto',
};
