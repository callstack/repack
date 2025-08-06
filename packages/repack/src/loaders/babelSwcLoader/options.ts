import type { TransformOptions } from '@babel/core';
import type { SwcLoaderOptions } from '@rspack/core';

type BabelOverrides = TransformOptions;
type SwcOverrides = Omit<SwcLoaderOptions, 'rspackExperiments'>;

export interface BabelSwcLoaderOptions {
  hideParallelModeWarning?: boolean;
  lazyImports?: boolean | string[];
  babelOverrides?: BabelOverrides;
  swcOverrides?: SwcOverrides;
}
