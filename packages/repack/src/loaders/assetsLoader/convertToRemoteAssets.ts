import path from 'node:path';
import dedent from 'dedent';
import type { Asset } from './types';
import { getAssetSize } from './utils';

export function convertToRemoteAssets({
  assets,
  assetsDirname,
  remotePublicPath,
  resourceDirname,
  resourceExtensionType,
  resourceFilename,
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
}) {
  const assetPath = path
    .join(assetsDirname, resourceDirname)
    .replace(pathSeparatorRegexp, '/');

  // works on both unix & windows
  const publicPathURL = new URL(path.join(remotePublicPath, assetPath));

  const size = getAssetSize(assets);

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
