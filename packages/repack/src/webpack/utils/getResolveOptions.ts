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
export function getResolveOptions(platform: string) {
  return {
    /**
     * Match what React Native packager supports.
     * First entry takes precedence.
     */
    mainFields: ['react-native', 'browser', 'main'],
    aliasFields: ['react-native', 'browser', 'main'],
    extensions: [
      `.${platform}.ts`,
      `.${platform}.mjs`,
      `.${platform}.js`,
      `.${platform}.tsx`,
      `.${platform}.jsx`,
      '.native.ts',
      '.native.mjs',
      '.native.js',
      '.native.tsx',
      '.native.jsx',
      '.ts',
      '.mjs',
      '.js',
      '.tsx',
      '.jsx',
      '.json',
    ],
  };
}
