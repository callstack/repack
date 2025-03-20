import { SCALABLE_ASSETS, SCALABLE_RESOLUTIONS } from './assetExtensions.js';

interface GetResolveOptionsResult {
  mainFields: string[];
  aliasFields: string[];
  conditionNames: string[];
  exportsFields: string[];
  extensions: string[];
  extensionAlias: Record<string, string[]>;
  byDependency: Record<string, { conditionNames: string[] }>;
}

/**
 * {@link getResolveOptions} additional options.
 */
export interface ResolveOptions {
  /**
   * Whether to enable Package Exports support. Defaults to `false`.
   */
  enablePackageExports?: boolean;
  /**
   * Whether to prefer native platform over generic platform. Defaults to `true`
   */
  preferNativePlatform?: boolean;
}

/**
 * Get Webpack's resolve options to properly resolve JavaScript files:
 * - resolve platform extensions (e.g. `file.ios.js`)
 * - resolve native extensions (e.g. `file.native.js`)
 * - optionally use package exports (`exports` field in `package.json`) instead of
 *   main fields (e.g. `main` or `browser` or `react-native`)
 *
 * @param platform Target application platform.
 * @param options Additional options that can modify resolution behaviour.
 * @returns Webpack's resolve options.
 *
 * @category Webpack util
 *
 * @example Usage in Webpack config:
 *
 * ```ts
 * import * as Repack from '@callstack/repack';
 *
 * export default (env) => {
 *   const { platform } = env;
 *
 *   return {
 *     resolve: {
 *       ...Repack.getResolveOptions(platform, {
 *         enablePackageExports: false,
 *         preferNativePlatform: true
 *       }),
 *     },
 *   };
 * };
 * ```
 */

export function getResolveOptions(
  options?: ResolveOptions
): GetResolveOptionsResult;

export function getResolveOptions(
  platform: string,
  options?: ResolveOptions
): GetResolveOptionsResult;

export function getResolveOptions(
  platformOrOptions: unknown,
  options?: ResolveOptions
): GetResolveOptionsResult {
  // if platform is undefined, use '[platform]' as placeholder
  const _platform =
    typeof platformOrOptions === 'string' ? platformOrOptions : '[platform]';
  const _options = (
    typeof platformOrOptions === 'object' ? platformOrOptions : options
  ) as ResolveOptions | undefined;

  const preferNativePlatform = _options?.preferNativePlatform ?? true;
  const enablePackageExports = _options?.enablePackageExports ?? true;

  let extensions = ['.js', '.jsx', '.ts', '.tsx', '.json'];

  let exportsFields: string[];
  let conditionNames: string[];

  if (enablePackageExports) {
    /**
     * Match what React Native uses in @react-native/metro-config.
     * Order of conditionNames doesn't matter.
     * Order inside of target package.json's `exports` field matters.
     */
    exportsFields = ['exports'];
    conditionNames = ['react-native'];
  } else {
    conditionNames = [];
    exportsFields = [];
    extensions = extensions.flatMap((ext) => {
      const platformExt = `.${_platform}${ext}`;
      const nativeExt = `.native${ext}`;

      if (preferNativePlatform) {
        return [platformExt, nativeExt, ext];
      }
      return [platformExt, ext];
    });
  }

  /**
   * We add `import` and `require` to conditionNames everytime
   * because package imports are enabled at all times in metro
   * and they need condition names to be defined.
   */
  const byDependency = {
    esm: { conditionNames: ['import'] },
    commonjs: { conditionNames: ['require'] },
  };

  /**
   * Match what React Native uses from metro-config.
   * Usage of 'extensionAlias' removes the need for
   * AssetResolverPlugin altogether.
   */
  const extensionAlias = Object.fromEntries(
    SCALABLE_ASSETS.map((assetExt) => {
      const ext = '.' + assetExt;
      const aliases = SCALABLE_RESOLUTIONS.map((scale) => {
        return '@' + scale + 'x' + ext;
      });
      return [ext, aliases.concat(ext)];
    })
  );

  /**
   * Match what React Native uses in @react-native/metro-config.
   * First entry takes precedence.
   *
   * Reference: https://github.com/facebook/react-native/blob/main/packages/metro-config/src/index.flow.js
   */
  return {
    /**
     * Reference: Webpack's [configuration.resolve.mainFields](https://webpack.js.org/configuration/resolve/#resolvemainfields)
     */
    mainFields: ['react-native', 'browser', 'main'],
    /**
     * Reference: Webpack's [configuration.resolve.aliasFields](https://webpack.js.org/configuration/resolve/#resolvealiasfields)
     */
    aliasFields: ['react-native', 'browser', 'main'],
    /**
     * Reference: Webpack's [configuration.resolve.conditionNames](https://webpack.js.org/configuration/resolve/#resolveconditionnames)
     */
    conditionNames: conditionNames,
    /**
     * Reference: Webpack's [configuration.resolve.exportsFields](https://webpack.js.org/configuration/resolve/#resolveexportsfields)
     */
    exportsFields: exportsFields,
    /**
     * Reference: Webpack's [configuration.resolve.extensions](https://webpack.js.org/configuration/resolve/#resolveextensions)
     */
    extensions: extensions,
    /**
     * Reference: Webpack's [configuration.resolve.extensionAlias](https://webpack.js.org/configuration/resolve/#resolveextensionalias)
     */
    extensionAlias: extensionAlias,
    /**
     * Reference: Webpack's [configuration.resolve.byDependency](https://webpack.js.org/configuration/resolve/#resolvebydependency)
     */
    byDependency: byDependency,
  };
}
