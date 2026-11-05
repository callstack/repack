import path from 'node:path';
import * as Repack from '@callstack/repack';

const BITMAP_EXTENSIONS = Repack.getAssetExtensionsRegExp(
  Repack.ASSET_EXTENSIONS.filter((ext) => ext !== 'svg')
);

export function buildHostAssetRules(context: string) {
  const localAssets = path.join(context, 'src/host/assets/localAssets');
  const inlineAssets = path.join(context, 'src/host/assets/inlineAssets');

  return [
    {
      test: BITMAP_EXTENSIONS,
      exclude: [localAssets, inlineAssets],
      use: {
        loader: '@callstack/repack/assets-loader',
        options: { inline: true, maxInlineSize: 90 * 1024 },
      },
    },
    {
      test: /\.svg$/,
      use: [
        {
          loader: '@svgr/webpack',
          options: { native: true, dimensions: false },
        },
      ],
    },
    {
      test: BITMAP_EXTENSIONS,
      include: [localAssets],
      use: '@callstack/repack/assets-loader',
    },
    {
      test: BITMAP_EXTENSIONS,
      include: [inlineAssets],
      use: {
        loader: '@callstack/repack/assets-loader',
        options: { inline: true },
      },
    },
  ];
}
