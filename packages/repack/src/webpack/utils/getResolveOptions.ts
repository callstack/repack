/**
 * Get Webpack's resolve options to properly resolve JavaScript files
 * that contain `<platform>` or `native` (eg `file.ios.js`) suffixes as well as `react-native` field
 * in dependencies' `package.json`.
 *
 * @param platform Target application platform.
 * @param enablePackageExports Whether to resolve `exports` field in `package.json`. Defaults to false.
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
export function getResolveOptions(
  platform: string,
  enablePackageExports?: boolean
) {
  let exportsFields: string[];
  let extensions = [
    '.native.ts',
    '.native.js',
    '.native.tsx',
    '.native.jsx',
    '.ts',
    '.js',
    '.tsx',
    '.jsx',
    '.json',
  ];

  if (enablePackageExports) {
    exportsFields = ['exports'];
  } else {
    exportsFields = [];
    // Only resolve platform extensions when package exports are disabled
    extensions = [
      `.${platform}.ts`,
      `.${platform}.js`,
      `.${platform}.tsx`,
      `.${platform}.jsx`,
      ...extensions,
    ];
  }

  return {
    /**
     * Match what React Native packager supports.
     * First entry takes precedence.
     */
    mainFields: ['react-native', 'browser', 'main'],
    aliasFields: ['react-native', 'browser', 'main'],
    conditionNames: ['require', 'import', 'react-native'],
    exportsFields,
    extensions,
  };
}
