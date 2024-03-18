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

export function getResolveOptions(platform: string, options: ResolveOptions) {
  const preferNativePlatform = options.preferNativePlatform ?? true;
  const enablePackageExports = options.enablePackageExports ?? false;

  let extensions = ['.ts', '.js', '.tsx', '.jsx', '.json'];

  const platformExtensions = [
    `.${platform}.ts`,
    `.${platform}.js`,
    `.${platform}.tsx`,
    `.${platform}.jsx`,
  ];

  const nativeExtensions = [
    '.native.ts',
    '.native.js',
    '.native.tsx',
    '.native.jsx',
  ];

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
    extensions = [
      platformExtensions,
      preferNativePlatform ? nativeExtensions : [],
      extensions,
    ].flat();
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
