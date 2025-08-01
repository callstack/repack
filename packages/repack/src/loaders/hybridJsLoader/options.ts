import type { LoaderContext } from '@rspack/core';
import { validate } from 'schema-utils';

export interface HybridJsLoaderOptions {
  lazyImports: boolean | string[];
  projectRoot: string;
}

type Schema = Parameters<typeof validate>[0];

export const optionsSchema: Schema = {
  type: 'object',
  required: [],
  properties: {
    lazyImports: {
      oneOf: [
        { type: 'boolean' },
        {
          type: 'array',
          items: { type: 'string' },
        },
      ],
    },
    projectRoot: {
      type: 'string',
    },
  },
};

export function getOptions(
  loaderContext: LoaderContext<HybridJsLoaderOptions>
): HybridJsLoaderOptions {
  const options = loaderContext.getOptions(loaderContext) || {};

  validate(optionsSchema, options, { name: 'repackJsLoader' });

  return options;
}
