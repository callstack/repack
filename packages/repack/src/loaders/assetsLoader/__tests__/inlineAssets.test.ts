import vm from 'node:vm';
import { inlineAssets } from '../inlineAssets.js';
import type { Asset } from '../types.js';

// Same logic as `pickScale` from `react-native/Libraries/Image/AssetUtils`,
// which expects `scales` to be sorted in ascending order.
function pickScale(scales: number[], deviceScale: number) {
  for (const scale of scales) {
    if (scale >= deviceScale) {
      return scale;
    }
  }
  return scales[scales.length - 1] || 1;
}

function evaluateInlinedAsset(code: string, pixelRatio: number) {
  const module = { exports: {} as { scale?: number } };
  const require = (request: string) =>
    request === 'react-native'
      ? { PixelRatio: { get: () => pixelRatio } }
      : { pickScale };

  vm.runInNewContext(code, { module, require });
  return module.exports;
}

// assets are sorted by scale in ascending order, as in the assets loader
const assets: Asset[] = [0.75, 1, 1.5, 2, 3].map((scale) => ({
  data: Buffer.from(`star@${scale}x`),
  dimensions: { width: 10, height: 10 },
  filename: `star@${scale}x.png`,
  scale,
}));

describe('inlineAssets', () => {
  it.each([
    [0.75, 0.75],
    [1, 1],
    [1.5, 1.5],
    [2.625, 3],
    [3.5, 3],
  ])('picks the right scale for pixel ratio %s', (pixelRatio, expected) => {
    const code = inlineAssets({ assets, resourcePath: 'star.png' });

    expect(evaluateInlinedAsset(code, pixelRatio).scale).toBe(expected);
  });
});
