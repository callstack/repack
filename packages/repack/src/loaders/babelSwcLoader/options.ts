import type { TransformOptions } from '@babel/core';
import type { SwcLoaderOptions } from '@rspack/core';
import type { HermesParserOptions } from '../babelLoader/options.js';

type BabelOverrides = TransformOptions;
type SwcOverrides = Omit<SwcLoaderOptions, 'rspackExperiments'>;

export type BabelSwcLoaderOptions = {
  hideParallelModeWarning?: boolean;
  lazyImports?: boolean | string[];
  babelOverrides?: BabelOverrides;
  swcOverrides?: SwcOverrides;
} & HermesParserOptions;
