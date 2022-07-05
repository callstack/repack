import path from 'path';
import escapeStringRegexp from 'escape-string-regexp';
import imageSize from 'image-size';
import dedent from 'dedent';
import hasha from 'hasha';
import type { ISizeCalculationResult } from 'image-size/dist/types/interface';
import type { WebpackLogger } from '../../../types';
import type { Asset } from './types';

export async function extractAsset(
  {
    resourcePath,
    resourceDirname,
    resourceFilename,
    resourceExtensionType,
    scaleKeys,
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
    scaleKeys: string[];
    assets: Asset[];
    suffixPattern: string;
    assetsDirname: string;
    pathSeparatorRegexp: RegExp;
    publicPath?: string;
    devServerEnabled?: boolean;
  },
  logger: WebpackLogger
) {
  const scaleNumbers = scaleKeys.map((scale) =>
    parseFloat(scale.replace(/[^\d.]/g, ''))
  );

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

  let info: ISizeCalculationResult | undefined;
  try {
    info = imageSize(resourcePath);

    const [, scaleMatch = ''] =
      path
        .basename(resourcePath)
        .match(
          new RegExp(`^${escapeStringRegexp(resourceFilename)}${suffixPattern}`)
        ) ?? [];

    if (scaleMatch) {
      const scale = Number(scaleMatch.replace(/[^\d.]/g, ''));

      if (typeof scale === 'number' && Number.isFinite(scale)) {
        info.width && (info.width /= scale);
        info.height && (info.height /= scale);
      }
    }
  } catch {
    // Asset is not an image
  }

  logger.debug(`Extracted asset ${resourcePath}`, {
    scaleNumbers,
    hashes,
    publicPath: customPublicPath,
    height: info?.height,
    width: info?.width,
  });

  return dedent`
    var AssetRegistry = require('react-native/Libraries/Image/AssetRegistry');
    module.exports = AssetRegistry.registerAsset({
      __packager_asset: true,
      scales: ${JSON.stringify(scaleNumbers)},
      name: ${JSON.stringify(resourceFilename)},
      type: ${JSON.stringify(resourceExtensionType)},
      hash: ${JSON.stringify(hashes.join())},
      httpServerLocation: ${JSON.stringify(publicPath)},
      ${
        devServerEnabled
          ? `fileSystemLocation: ${JSON.stringify(resourceDirname)},`
          : ''
      }
      ${info ? `height: ${info.height},` : ''}
      ${info ? `width: ${info.width},` : ''}
    });
    `;
}
