import path from 'node:path';
import imageSize from 'image-size';
import escapeStringRegexp from 'escape-string-regexp';
import type { CollectedScales, ImageSize } from './types';

export function getScaleNumber(scaleKey: string) {
  return parseFloat(scaleKey.replace(/[^\d.]/g, ''));
}

export function getImageSize({
  resourcePath,
  resourceFilename,
  suffixPattern,
}: {
  resourcePath: string;
  resourceFilename: string;
  suffixPattern: string;
}): ImageSize | undefined {
  let info: ImageSize | undefined;
  try {
    info = imageSize(resourcePath);
    const [, scaleMatch = ''] =
      path
        .basename(resourcePath)
        .match(
          new RegExp(`^${escapeStringRegexp(resourceFilename)}${suffixPattern}`)
        ) ?? [];
    if (scaleMatch) {
      const scale = Number(scaleMatch.replace(/[^\d.]/g, ''));
      if (typeof scale === 'number' && Number.isFinite(scale)) {
        info.width && (info.width /= scale);
        info.height && (info.height /= scale);
      }
    }
  } catch {
    // Asset is not an image
  }

  return info;
}

// eslint-disable-next-line require-await
export async function collectScales(
  resourceAbsoluteDirname: string,
  resourceFilename: string,
  resourceExtension: string,
  scalableAssetExtensions: string[],
  scalableAssetResolutions: string[],
  readdirAsync: (path: string) => Promise<string[]>
): Promise<CollectedScales> {
  // NOTE: assets can't have platform extensions!
  // NOTE: this probably needs to handle nonscalable too
  if (!scalableAssetExtensions.includes(resourceExtension)) {
    return { '@1x': resourceFilename + '.' + resourceExtension };
  }

  // explicit scales
  const candidates = scalableAssetResolutions.map((scaleKey) => {
    const scale = '@' + scaleKey + 'x';
    return [scale, resourceFilename + scale + '.' + resourceExtension];
  });
  // implicit 1x scale
  candidates.push(['@1x', resourceFilename + '.' + resourceExtension]);

  // exposed fs is not fully compliant to fs spec
  const contents = await readdirAsync(resourceAbsoluteDirname);
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
