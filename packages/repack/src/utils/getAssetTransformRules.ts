import { getAssetExtensionsRegExp } from './assetExtensions.js';

export function getAssetTransformRules() {
  return [
    {
      test: getAssetExtensionsRegExp(),
      use: '@callstack/repack/assets-loader',
    },
  ];
}
