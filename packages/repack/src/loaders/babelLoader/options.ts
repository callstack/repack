import type { TransformOptions } from '@babel/core';

export interface BabelLoaderOptions extends TransformOptions {}

export interface CustomTransformOptions extends TransformOptions {
  includePlugins?: Array<string | [string, Record<string, any>]>;
  excludePlugins?: string[];
}
