import path from 'path';
import dedent from 'dedent';
import hasha from 'hasha';
import type { InfrastructureLogger } from '../../../types';
import type { Asset } from './types';
import { getImageSize } from './utils';

export async function extractAssets(
  {
    resourcePath,
    resourceDirname,
    resourceFilename,
    resourceExtensionType,
    assets,
    suffixPattern,
    assetsDirname,
    pathSeparatorRegexp,
    publicPath: customPublicPath,
    devServerEnabled,
  }: {
    resourcePath: string;
    resourceDirname: string;
    resourceFilename: string;
    resourceExtensionType: string;
    assets: Asset[];
    suffixPattern: string;
    assetsDirname: string;
    pathSeparatorRegexp: RegExp;
    publicPath?: string;
    devServerEnabled?: boolean;
  },
  logger: InfrastructureLogger
) {
  let publicPath = path
    .join(assetsDirname, resourceDirname)
    .replace(pathSeparatorRegexp, '/');

  if (customPublicPath) {
    publicPath = path.join(customPublicPath, publicPath);
  }

  const hashes = await Promise.all(
    assets.map((asset) =>
      hasha.async(asset.content?.toString() ?? asset.filename, {
        algorithm: 'md5',
      })
    )
  );

  const size = getImageSize({
    resourceFilename,
    resourcePath,
    suffixPattern,
  });

  logger.debug(
    `Extracted assets for request ${resourcePath}`,
    JSON.stringify({
      hashes,
      publicPath: customPublicPath,
      height: size?.height,
      width: size?.width,
    })
  );

  return dedent`
    var AssetRegistry = require('react-native/Libraries/Image/AssetRegistry');
    module.exports = AssetRegistry.registerAsset({
      __packager_asset: true,
      scales: ${JSON.stringify(assets.map((asset) => asset.scale))},
      name: ${JSON.stringify(resourceFilename)},
      type: ${JSON.stringify(resourceExtensionType)},
      hash: ${JSON.stringify(hashes.join())},
      httpServerLocation: ${JSON.stringify(publicPath)},
      ${
        devServerEnabled
          ? `fileSystemLocation: ${JSON.stringify(resourceDirname)},`
          : ''
      }
      ${size ? `height: ${size.height},` : ''}
      ${size ? `width: ${size.width},` : ''}
    });
    `;
}
