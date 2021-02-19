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
    ],
  };
}
