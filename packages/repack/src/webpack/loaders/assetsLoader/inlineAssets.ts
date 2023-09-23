import dedent from 'dedent';
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
      `Cannot inline asset for request ${resourcePath} - unable to detect MIME type`
    );
  }

  // keys are always converted to strings
  const sourceSet = assets.reduce(
    (sources, asset) => {
      sources[asset.scale] = encodeAsset(asset, mimeType, size);
      return sources;
    },
    {} as Record<string, URISource>
  );

  const scales = JSON.stringify(Object.keys(sourceSet).map(Number));

  // we need to import PixelRatio to remain compatible
  // with older versions of React-Native
  return dedent`
    var PixelRatio = require('react-native/Libraries/Utilities/PixelRatio');
    var AssetSourceResolver = require('react-native/Libraries/Image/AssetSourceResolver');
    var prefferedScale = AssetSourceResolver.pickScale(${scales}, PixelRatio.get());

    module.exports = ${JSON.stringify(sourceSet)}[prefferedScale];
  `;
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
