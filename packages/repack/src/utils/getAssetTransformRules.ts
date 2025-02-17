import type { AssetLoaderRemoteOptions } from '../loaders/assetsLoader/options.js';
import {
  ASSET_EXTENSIONS,
  getAssetExtensionsRegExp,
} from './assetExtensions.js';

function getSvgRule(type: 'svgr' | 'xml' | 'uri') {
  if (type === 'svgr') {
    return {
      test: /\.svg$/,
      use: { loader: '@svgr/webpack', options: { native: true } },
    };
  }

  return {
    test: /\.svg$/,
    type: type === 'xml' ? 'asset/source' : 'asset/inline',
  };
}

/**
 * Interface for {@link getAssetTransformRules} options.
 */
interface GetAssetTransformRulesOptions {
  /**
   * Whether to inline assets as base64 URIs.
   */
  inline?: boolean;

  /**
   * Configuration for remote asset loading.
   */
  remote?: Omit<AssetLoaderRemoteOptions, 'enabled'>;

  /**
   * Determines how SVG files should be processed:
   * - 'svgr': Uses `@svgr/webpack` to transform SVGs into React Native components
   * - 'xml': Loads SVGs as raw XML source to be used with SvgXml from react-native-svg
   * - 'uri': Loads SVGs as inline URIs to be used with SvgUri from react-native-svg
   */
  svg?: 'svgr' | 'xml' | 'uri';
}

/**
 * Creates `module.rules` configuration for handling assets in React Native applications.
 *
 * @param options Configuration options
 * @param options.inline Whether to inline assets as base64 URIs (defaults to false)
 * @param options.remote Configuration for remote asset loading with publicPath and optional assetPath function
 * @param options.svg Determines how SVG files should be processed ('svgr', 'xml', or 'uri')
 *
 * @returns Array of webpack/rspack rules for transforming assets
 */
export function getAssetTransformRules({
  inline,
  remote,
  svg,
}: GetAssetTransformRulesOptions = {}) {
  const extensions = svg
    ? ASSET_EXTENSIONS.filter((ext) => ext !== 'svg')
    : ASSET_EXTENSIONS;

  const remoteOptions = remote
    ? {
        enabled: true,
        ...remote,
      }
    : undefined;

  const rules = [];

  rules.push({
    test: getAssetExtensionsRegExp(extensions),
    use: {
      loader: '@callstack/repack/assets-loader',
      options: { inline, remote: remoteOptions },
    },
  });

  if (svg) {
    rules.push(getSvgRule(svg));
  }

  return rules;
}
