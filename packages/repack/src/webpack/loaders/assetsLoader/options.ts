import { validate } from 'schema-utils';
import { LoaderContext } from '@rspack/core';

/**
 * Note: platform is not needed - can be removed
 * Note: devServer enabled can be inferred from loader context:
 *       - we can access this.mode & this.hot
 */
export interface AssetLoaderOptions {
  platform: string;
  scalableAssetExtensions?: string[];
  scalableAssetResolutions?: string[];
  devServerEnabled?: boolean;
  inline?: boolean;
  publicPath?: string;
  remote?: {
    enabled: boolean;
    publicPath: string;
  };
}

type Schema = Parameters<typeof validate>[0];

export const optionsSchema: Schema = {
  type: 'object',
  required: ['platform'],
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

export function getOptions(
  loaderContext: LoaderContext<AssetLoaderOptions>
): AssetLoaderOptions {
  const options = loaderContext.getOptions(loaderContext) || {};

  validate(optionsSchema, options, { name: 'repackAssetsLoader' });

  return options;
}
