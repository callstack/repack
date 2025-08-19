import type { TransformOptions } from '@babel/core';

export interface HermesParserOverrides {
  babel?: boolean;
  flow?: 'all' | 'detect';
  reactRuntimeTarget?: '18' | '19';
  sourceType?: 'module' | 'script' | 'unambiguous';
}

export interface HermesParserOptions {
  hermesParserPath?: string;
  hermesParserOverrides?: HermesParserOverrides;
}

export interface BabelPluginOverrides {
  includePlugins?: Array<string | [string, Record<string, any>]>;
  excludePlugins?: string[];
}

export type BabelLoaderOptions = TransformOptions & HermesParserOptions;

export type CustomTransformOptions = HermesParserOptions & BabelPluginOverrides;
