import { Schema } from '../types';

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
