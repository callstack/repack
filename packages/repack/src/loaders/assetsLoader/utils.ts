import path from 'node:path';
import imageSize from 'image-size';
import type { Asset, AssetDimensions, CollectedScales } from './types';

export function getScaleNumber(scaleKey: string) {
  return parseFloat(scaleKey.replace(/[^\d.]/g, ''));
}

/** Default asset is the one with scale that was originally requested in the loader */
export function getDefaultAsset(assets: Asset[]) {
  const defaultAsset = assets.find((asset) => asset.default === true);
  if (!defaultAsset) {
    throw new Error('Malformed assets array - no default asset found');
  }
  return defaultAsset;
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
  readDirAsync: (path: string) => Promise<string[]>
): Promise<CollectedScales> {
  if (!scalableAssetExtensions.includes(resourceExtension)) {
    return {
      '@1x': path.join(
        resourceAbsoluteDirname,
        resourceFilename + '.' + resourceExtension
      ),
    };
  }

  // explicit scales
  const candidates = scalableAssetResolutions.map((scaleKey) => {
    const scale = '@' + scaleKey + 'x';
    return [scale, resourceFilename + scale + '.' + resourceExtension];
  });
  // implicit 1x scale
  candidates.push(['@1x', resourceFilename + '.' + resourceExtension]);

  const contents = await readDirAsync(resourceAbsoluteDirname);
  const entries = new Set(contents);

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
