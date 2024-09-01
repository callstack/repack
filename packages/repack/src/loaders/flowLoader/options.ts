import { validate } from 'schema-utils';
import type { LoaderContext } from '@rspack/core';

export interface FlowLoaderOptions {
  all?: boolean;
  ignoreUninitializedFields?: boolean;
  pretty?: true;
}

type Schema = Parameters<typeof validate>[0];

export const optionsSchema: Schema = {
  type: 'object',
  required: [],
  properties: {
    all: { type: 'boolean' },
    ignoreUninitializedFields: { type: 'boolean' },
    pretty: { type: 'boolean' },
  },
};

export function getOptions(
  loaderContext: LoaderContext<FlowLoaderOptions>
): FlowLoaderOptions {
  const options = loaderContext.getOptions(loaderContext) || {};

  validate(optionsSchema, options, { name: 'repackFlowLoader' });

  return options;
}
