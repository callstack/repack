import { validateSchema } from 'webpack';
import utils, { LoaderContext } from 'loader-utils';

export interface Options {
  platform: string;
  scalableAssetExtensions: string[];
  devServerEnabled?: boolean;
  inline?: boolean;
  publicPath?: string;
  remote?: {
    enabled: boolean;
    publicPath: string;
  };
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
    devServerEnabled: { type: 'boolean' },
    publicPath: { type: 'string' },
    remote: {
      type: 'object',
      required: ['enabled', 'publicPath'],
      properties: {
        enabled: { type: 'boolean' },
        publicPath: { type: 'string', pattern: '^https?://' },
      },
    },
  },
};

export function getOptions(loaderContext: LoaderContext): Options {
  const options = utils.getOptions(loaderContext) || {};

  validateSchema(optionsSchema, options, { name: 'repackAssetsLoader' });

  return options as unknown as Options;
}
