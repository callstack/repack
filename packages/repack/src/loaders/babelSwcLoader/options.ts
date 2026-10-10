import type { TransformOptions } from '@babel/core';
import type { SwcLoaderJscConfig, SwcLoaderOptions } from '@rspack/core';
import type { HermesParserOptions } from '../babelLoader/options.js';

/**
 * `SwcLoaderOptions` is a union discriminated on `detectSyntax`. The loader
 * always sets `jsc.parser` itself and never uses `detectSyntax: 'auto'`,
 * so it works on the non-union member only.
 */
export type SwcConfig = Omit<SwcLoaderOptions, 'detectSyntax' | 'jsc'> & {
  detectSyntax?: false;
  jsc?: SwcLoaderJscConfig;
};

type BabelOverrides = TransformOptions;
type SwcOverrides = Omit<SwcConfig, 'rspackExperiments'>;

export type BabelSwcLoaderOptions = {
  lazyImports?: boolean | string[];
  babelOverrides?: BabelOverrides;
  swcOverrides?: SwcOverrides;
} & HermesParserOptions;
