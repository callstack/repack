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

export function getResolveOptions(platform: string, options?: ResolveOptions) {
  const preferNativePlatform = options?.preferNativePlatform ?? true;
  const enablePackageExports = options?.enablePackageExports ?? false;

  let extensions = ['.js', '.jsx', '.json', '.ts', '.tsx'];

  let conditionNames: string[];
  let exportsFields: string[];

  if (enablePackageExports) {
    /**
     * Match what React Native uses in @react-native/metro-config.
     * Order of conditionNames doesn't matter.
     * Order inside of target package.json's `exports` field matters.
     */
    conditionNames = ['require', 'import', 'react-native'];
    exportsFields = ['exports'];
  } else {
    conditionNames = [];
    exportsFields = [];
    extensions = extensions.flatMap((ext) => {
      const platformExt = `.${platform}${ext}`;
      const nativeExt = `.native${ext}`;

      if (preferNativePlatform) {
        return [platformExt, nativeExt, ext];
      } else {
        return [platformExt, ext];
      }
    });
  }

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
  };
}
