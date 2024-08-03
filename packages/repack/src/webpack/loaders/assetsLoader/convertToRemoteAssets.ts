import path from 'path';
import dedent from 'dedent';
import { getImageSize } from './utils';
import type { Asset } from './types';

export function convertToRemoteAssets({
  assets,
  assetsDirname,
  remotePublicPath,
  resourceDirname,
  resourceExtensionType,
  resourceFilename,
  resourcePath,
  suffixPattern,
  pathSeparatorRegexp,
}: {
  assets: Asset[];
  assetsDirname: string;
  remotePublicPath: string;
  resourceDirname: string;
  resourceExtensionType: string;
  resourceFilename: string;
  resourcePath: string;
  suffixPattern: string;
  pathSeparatorRegexp: RegExp;
}): string {
  const assetPath = path
    .join(assetsDirname, resourceDirname)
    .replace(pathSeparatorRegexp, '/');

  // works on both unix & windows
  const publicPathURL = new URL(path.join(remotePublicPath, assetPath));

  const size = getImageSize({ resourcePath, resourceFilename, suffixPattern });

  const asset = JSON.stringify({
    name: resourceFilename,
    type: resourceExtensionType,
    httpServerLocation: publicPathURL.href,
    scales: assets.map((asset) => asset.scale),
    height: size?.height,
    width: size?.width,
  });

  return dedent`
    var AssetSourceResolver = require('react-native/Libraries/Image/AssetSourceResolver');
    var resolver = new AssetSourceResolver(undefined, undefined, ${asset});

    module.exports = resolver.scaledAssetPath();
  `;
}
