import type { RuleSetRule } from '@rspack/core';
import { REACT_NATIVE_LAZY_IMPORTS } from './lazyImports';

/**
 * TODO we need to find a way to isolate react-native from the rest of node_modules
 * so that we can use this config properly - this is easy for classic node_modules but
 * with pnpm it's a bit more tricky - store uses paths that have some characters replaced
 *
 * right now the implementation is adjusted for pnpm environment
 */
export const REACT_NATIVE_LOADING_RULES: RuleSetRule = {
  test: /\.jsx?$/,
  include: [
    /node_modules(.*[/\\])+react-native@/,
    /node_modules(.*[/\\])+@react-native\+/,
  ],
  use: [
    {
      loader: 'builtin:swc-loader',
      options: {
        env: {
          targets: { hermes: '0.12' },
        },
        jsc: {
          parser: {
            syntax: 'ecmascript',
            jsx: true,
            exportDefaultFrom: true,
          },
          externalHelpers: true,
        },
        module: {
          type: 'commonjs',
          strict: false,
          strictMode: false,
          lazy: REACT_NATIVE_LAZY_IMPORTS,
        },
      },
    },
    { loader: '@callstack/repack/flow-strip-types-loader' },
  ],
  type: 'javascript/auto',
};
