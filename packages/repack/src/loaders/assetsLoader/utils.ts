import path from 'node:path';
import imageSize from 'image-size';
import type { Asset, AssetDimensions, CollectedScales } from './types';

export function getScaleNumber(scaleKey: string) {
  return Number.parseFloat(scaleKey.replace(/[^\d.]/g, ''));
}

export function getAssetSize(assets: Asset[]) {
  // Use first asset for reference as size, just like in metro:
  // https://github.com/facebook/metro/blob/main/packages/metro/src/Assets.js#L223
  return assets[0].dimensions;
}

export function getAssetDimensions({
  resourceData,
  resourceScale,
}: {
  resourceData: Buffer;
  resourceScale: number;
}): AssetDimensions | null {
  try {
    const info = imageSize(resourceData);
    if (!info.width || !info.height) {
      return null;
    }
    return {
      width: info.width / resourceScale,
      height: info.height / resourceScale,
    };
  } catch {
    return null;
  }
}

export async function collectScales(
  resourceAbsoluteDirname: string,
  resourceFilename: string,
  resourceExtension: string,
  scalableAssetExtensions: string[],
  scalableAssetResolutions: string[],
  platform: string,
  readDirAsync: (path: string) => Promise<string[]>
): Promise<CollectedScales> {
  // implicit 1x scale
  let candidates = [
    ['@1x', resourceFilename + '.' + resourceExtension],
    ['@1x', resourceFilename + '.' + platform + '.' + resourceExtension],
  ];

  // explicit scales
  if (scalableAssetExtensions.includes(resourceExtension)) {
    candidates = candidates.concat(
      scalableAssetResolutions.flatMap((scaleKey) => {
        const scale = '@' + scaleKey + 'x';
        return [
          [scale, resourceFilename + scale + '.' + resourceExtension],
          [scale, resourceFilename + '.' + platform + '.' + resourceExtension],
        ];
      })
    );
  }

  const contents = await readDirAsync(resourceAbsoluteDirname);
  const entries = new Set(contents);

  // assets with platform extensions are more specific and take precedence
  const collectedScales: Record<string, string> = {};
  for (const candidate of candidates) {
    const [scaleKey, candidateFilename] = candidate;
    if (entries.has(candidateFilename)) {
      const filepath = path.join(resourceAbsoluteDirname, candidateFilename);
      collectedScales[scaleKey] = filepath;
    }
  }

  return collectedScales;
}
