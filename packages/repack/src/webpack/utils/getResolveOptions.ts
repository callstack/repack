/**
 * Get Webpack's resolve options to properly resolve JavaScript files
 * that contain `<platform>` or `native` (eg `file.ios.js`) suffixes as well as `react-native` field
 * in dependencies' `package.json`.
 *
 * @param platform Target application platform.
 * @returns Webpack's resolve options.
 *
 * @category Webpack util
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
      `.${platform}.js`,
      `.${platform}.tsx`,
      `.${platform}.jsx`,
      '.native.ts',
      '.native.js',
      '.native.tsx',
      '.native.jsx',
      '.ts',
      '.js',
      '.tsx',
      '.jsx',
      '.json',
    ],
  };
}
