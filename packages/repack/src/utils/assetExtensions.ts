/** Extensions array of all scalable assets - images. */
export const SCALABLE_ASSETS: string[] = [
  // Image formats
  'bmp',
  'gif',
  'jpg',
  'jpeg',
  'png',
  'psd',
  'svg',
  'webp',
  'tiff',
];

/** Resolutions array of all supported asset resolutions */
export const SCALABLE_RESOLUTIONS = ['0.75', '1', '1.5', '2', '3', '4'];

/** Extensions array of all supported assets by Re.Pack's Assets loader. */
export const ASSET_EXTENSIONS: string[] = [
  ...SCALABLE_ASSETS,
  // Video formats
  'm4v',
  'mov',
  'mp4',
  'mpeg',
  'mpg',
  'webm',
  // Audio formats
  'aac',
  'aiff',
  'caf',
  'm4a',
  'mp3',
  'wav',
  // Document formats
  'html',
  'pdf',
  'yaml',
  'yml',
  // Font formats
  'otf',
  'ttf',
  // Other
  'zip',
  'obj',
];

/**
 * Creates RegExp from array of asset extensions.
 *
 * @param extensions Extensions array.
 * @returns RegExp with extensions.
 *
 * @example Usage in Webpack config:
 * ```ts
 * import React from '@callstack/repack';
 *
 * export default () => {
 *   return {
 *     module: {
 *       rules: [{
 *         test: React.getAssetExtensionsRegExp(
 *           Repack.ASSET_EXTENSIONS.filter((ext) => ext !== 'svg')
 *         ),
 *         use: {
 *           loader: '@callstack/repack/assets-loader',
 *         }
 *       }],
 *     },
 *   };
 * };
 * ```
 */
export function getAssetExtensionsRegExp(
  extensions: string[] = ASSET_EXTENSIONS
): RegExp {
  return new RegExp(`\\.(${extensions.join('|')})$`);
}
