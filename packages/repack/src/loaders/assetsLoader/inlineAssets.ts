import dedent from 'dedent';
import mimeTypes from 'mime-types';
import type { Asset, URISource } from './types.js';

export function inlineAssets({
  assets,
  resourcePath,
}: {
  assets: Asset[];
  resourcePath: string;
}) {
  const mimeType = mimeTypes.lookup(resourcePath) || undefined;

  if (!mimeType) {
    throw new Error(
      `Cannot inline asset for request ${resourcePath} - unable to detect MIME type`
    );
  }

  // keys are always converted to strings
  const sourceSet = assets.reduce(
    (sources, { data, dimensions, scale }) => {
      sources[scale] = {
        uri: `data:${mimeType};base64,${data.toString('base64')}`,
        width: dimensions?.width,
        height: dimensions?.height,
        scale: scale,
      };
      return sources;
    },
    {} as Record<string, URISource>
  );

  const scales = JSON.stringify(Object.keys(sourceSet).map(Number));

  /**
   * To enable scale resolution in runtime we need to import PixelRatio & AssetSourceResolver
   * Although we could use AssetSourceResolver as it is, we need to import PixelRatio to remain
   * compatible with older versions of React-Native. Newer versions of React-Native use
   * ESM for PixelRatio, so we need to check if PixelRatio is an ESM module and if so, adjust the import.
   */
  return dedent`
    var PixelRatio = require('react-native').PixelRatio;
    var AssetSourceResolver = require('react-native/Libraries/Image/AssetSourceResolver');

    if ('default' in AssetSourceResolver) AssetSourceResolver = AssetSourceResolver.default;
    var prefferedScale = AssetSourceResolver.pickScale(${scales}, PixelRatio.get());

    module.exports = ${JSON.stringify(sourceSet)}[prefferedScale];
  `;
}
