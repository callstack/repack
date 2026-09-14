import path from 'node:path';
import dedent from 'dedent';
import type { Asset } from './types.js';
import { getAssetSize } from './utils.js';

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

  // `remotePublicPath` is a URL, not a filesystem path, so it is joined with
  // `path.posix` — `path.join` would rewrite the separators on Windows and
  // produce something `new URL` rejects.
  const publicPathURL = new URL(path.posix.join(remotePublicPath, assetPath));

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
    if ('default' in AssetSourceResolver) AssetSourceResolver = AssetSourceResolver.default;
    var resolver = new AssetSourceResolver(undefined, undefined, ${asset});

    module.exports = resolver.scaledAssetPath();
  `;
}
