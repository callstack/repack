/**
 * Get Webpack's resolve options to properly resolve JavaScript files
 * that contain `<platform>` or `native` (eg `file.ios.js`) suffixes as well as `react-native` field
 * in dependencies' `package.json`.
 *
 * @param platform Target application platform.
 * @returns Webpack's resolve options.
 *
 * @category Webpack util
 *
 * @example Usage in Webpack config:
 * ```ts
 * import * as Repack from '@callstack/repack';
 *
 * export default (env) => {
 *   const { platform } = env;
 *
 *   return {
 *     resolve: {
 *       ...Repack.getResolveOptions(platform),
 *     },
 *   };
 * };
 * ```
 */
export function getResolveOptions({
  platform,
  enablePackageExports = false,
  preferNativePlatform = true,
}: {
  platform: string;
  enablePackageExports?: boolean;
  preferNativePlatform?: boolean;
}) {
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
     *
     * Source: https://github.com/facebook/react-native/blob/d53cc2b46dee5ed4d93ee76dea4aea9da42d0158/packages/metro-config/src/index.flow.js
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

  return {
    /**
     * Match what React Native packager supports.
     * First entry takes precedence.
     *
     * Source: https://github.com/facebook/react-native/blob/d53cc2b46dee5ed4d93ee76dea4aea9da42d0158/packages/metro-config/src/index.flow.js
     */
    mainFields: ['react-native', 'browser', 'main'],
    aliasFields: ['react-native', 'browser', 'main'],
    conditionNames,
    exportsFields,
    extensions,
  };
}
