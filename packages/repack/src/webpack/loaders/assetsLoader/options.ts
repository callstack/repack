import { validateSchema } from 'webpack';
import utils, { LoaderContext } from 'loader-utils';

export interface Options {
  platform: string;
  scalableAssetExtensions: string[];
  devServerEnabled?: boolean;
  inline?: boolean;
  inlineMaxSize?: number;
  publicPath?: string;
}

type Schema = Parameters<typeof validateSchema>[0];

export const optionsSchema: Schema = {
  type: 'object',
  required: ['platform', 'scalableAssetExtensions'],
  properties: {
    platform: {
      type: 'string',
    },
    scalableAssetExtensions: {
      type: 'array',
    },
    inline: { type: 'boolean' },
    inlineMaxSize: { type: 'number' },
    devServerEnabled: { type: 'boolean' },
    publicPath: { type: 'string' },
  },
};

export function getOptions(loaderContext: LoaderContext): Options {
  const options = utils.getOptions(loaderContext) || {};

  validateSchema(optionsSchema, options, { name: 'repackAssetsLoader' });

  return options as unknown as Options;
}
