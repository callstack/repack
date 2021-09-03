/** Extensions array of all scalable assets - images. */
export const SCALABLE_ASSETS = [
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

/** Extensions array of all supported assets by Re.Pack's {@link AssetResolver}. */
export const ASSET_EXTENSIONS = [
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
 */
export function getAssetExtensionsRegExp(extensions: string[]) {
  return new RegExp(`\\.(${extensions.join('|')})$`);
}
