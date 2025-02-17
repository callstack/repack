import type { RuleSetRule } from '@rspack/core';
import type { AssetLoaderRemoteOptions } from '../loaders/assetsLoader/options.js';
import {
  ASSET_EXTENSIONS,
  getAssetExtensionsRegExp,
} from './assetExtensions.js';

function getSvgRule(type: 'svgr' | 'xml' | 'uri'): RuleSetRule {
  if (type === 'svgr') {
    return {
      test: /\.svg$/,
      use: [{ loader: '@svgr/webpack', options: { native: true } }],
    };
  }

  return {
    test: /\.svg$/,
    type: type === 'xml' ? 'asset/source' : 'asset/inline',
  };
}

interface GetAssetTransformRulesOptions {
  inline?: boolean;
  remote?: Omit<AssetLoaderRemoteOptions, 'enabled'>;
  svg?: 'svgr' | 'xml' | 'uri';
}

export function getAssetTransformRules({
  inline,
  remote,
  svg,
}: GetAssetTransformRulesOptions = {}) {
  const extensions = svg
    ? ASSET_EXTENSIONS.filter((ext) => ext !== '.svg')
    : ASSET_EXTENSIONS;

  const remoteOptions = remote
    ? {
        enabled: true,
        ...remote,
      }
    : undefined;

  const rules: RuleSetRule[] = [
    {
      test: getAssetExtensionsRegExp(extensions),
      use: {
        loader: '@callstack/repack/assets-loader',
        options: { inline, remote: remoteOptions },
      },
    },
  ];

  if (svg) {
    rules.push(getSvgRule(svg));
  }

  return rules;
}
