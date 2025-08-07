import type { TransformOptions } from '@babel/core';

export interface HermesParserOverrides {
  babel?: boolean;
  flow?: 'all' | 'detect';
  reactRuntimeTarget?: '18' | '19';
  sourceType?: 'module' | 'script' | 'unambiguous';
}

export interface BabelLoaderOptions extends TransformOptions {
  hermesParserPath?: string;
  hermesParserOverrides?: HermesParserOverrides;
}

export interface CustomTransformOptions extends TransformOptions {
  includePlugins?: Array<string | [string, Record<string, any>]>;
  excludePlugins?: string[];
}
