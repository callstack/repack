import type { LoaderContext } from '@rspack/core';
import type { validate } from 'schema-utils';

export interface BabelLoaderOptions {
  projectRoot: string;
}

type Schema = Parameters<typeof validate>[0];

export const optionsSchema: Schema = {
  type: 'object',
  required: ['projectRoot'],
  properties: {
    projectRoot: { type: 'string' },
  },
};

export function getOptions(
  loaderContext: LoaderContext<BabelLoaderOptions>
): BabelLoaderOptions {
  const options = loaderContext.getOptions(loaderContext) || {};

  //   validate(optionsSchema, options, { name: 'repackBabelLoader' });

  return options;
}
