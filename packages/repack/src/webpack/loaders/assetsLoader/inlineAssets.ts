import mimeTypes from 'mime-types';
import type { Asset, ImageSize, URISource } from './types';
import { getImageSize } from './utils';

export function inlineAssets({
  assets,
  resourcePath,
  resourceFilename,
  suffixPattern,
}: {
  assets: Asset[];
  resourcePath: string;
  resourceFilename: string;
  suffixPattern: string;
}) {
  const mimeType = mimeTypes.lookup(resourcePath) || undefined;
  const size = getImageSize({ resourcePath, resourceFilename, suffixPattern });

  if (!mimeType) {
    throw new Error(
      `Cannot inline asset for request ${resourcePath} - unable to detect mime type`
    );
  }

  const sourceSet = assets.map((asset) => encodeAsset(asset, mimeType, size));

  return `module.exports = ${JSON.stringify(
    sourceSet.length === 1 ? sourceSet[0] : sourceSet
  )}`;
}

function encodeAsset(
  asset: Asset,
  mimeType: string,
  size?: ImageSize
): URISource {
  const encodedContent =
    asset.content instanceof Buffer
      ? asset.content.toString('base64')
      : Buffer.from(asset.content ?? '').toString('base64');

  return {
    uri: `data:${mimeType};base64,${encodedContent}`,
    width: size?.width,
    height: size?.height,
    scale: asset.scale,
  };
}
