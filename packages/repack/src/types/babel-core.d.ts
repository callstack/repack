import type { TransformOptions } from '@babel/core';

declare module '@babel/core' {
  interface BabelProjectConfig extends TransformOptions {
    plugins?: {
      key: string;
      manipulateOptions: (() => void) | undefined;
      post: (() => void) | undefined;
      pre: (() => void) | undefined;
      visitor: unknown;
      parserOverride: unknown;
      generatorOverride: undefined;
      options?: Record<string, any>;
      externalDependencies: unknown[];
    }[];
  }

  export function loadOptions(
    options: TransformOptions
  ): BabelProjectConfig | null;
}
