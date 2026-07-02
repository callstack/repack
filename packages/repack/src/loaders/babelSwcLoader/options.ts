import type { TransformOptions } from '@babel/core';
import type { SwcLoaderJscConfig, SwcLoaderOptions } from '@rspack/core';
import type { HermesParserOptions } from '../babelLoader/options.js';

/**
 * Rspack 2 turned `SwcLoaderOptions` into a union discriminated on
 * `detectSyntax`, which cannot be spread & reassembled type-safely.
 * Re.Pack never sets `detectSyntax`, so internal helpers operate on this
 * non-union shape, which stays assignable to `SwcLoaderOptions`.
 */
export type SwcConfig = Omit<SwcLoaderOptions, 'jsc' | 'detectSyntax'> & {
  detectSyntax?: false;
  jsc?: SwcLoaderJscConfig;
};

type BabelOverrides = TransformOptions;
// overrides are passed to the raw SWC transform API, so
// `builtin:swc-loader`-only options are not accepted here
type SwcOverrides = Omit<
  SwcConfig,
  | 'rspackExperiments'
  | 'transformImport'
  | 'collectTypeScriptInfo'
  | 'detectSyntax'
>;

export type BabelSwcLoaderOptions = {
  hideParallelModeWarning?: boolean;
  lazyImports?: boolean | string[];
  babelOverrides?: BabelOverrides;
  swcOverrides?: SwcOverrides;
} & HermesParserOptions;
