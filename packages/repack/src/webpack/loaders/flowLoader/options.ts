import type { validate } from 'schema-utils';

type Schema = Parameters<typeof validate>[0];

export interface FlowLoaderOptions {
  all?: boolean;
  pretty?: boolean;
}

export const flowLoaderOptionsSchema: Schema = {
  type: 'object',
  required: [],
  properties: {
    all: {
      type: 'boolean',
    },
    pretty: {
      type: 'boolean',
    },
  },
};
