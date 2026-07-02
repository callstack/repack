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
type SwcOverrides = Omit<SwcLoaderOptions, 'rspackExperiments'>;

export type BabelSwcLoaderOptions = {
  hideParallelModeWarning?: boolean;
  lazyImports?: boolean | string[];
  babelOverrides?: BabelOverrides;
  swcOverrides?: SwcOverrides;
} & HermesParserOptions;
