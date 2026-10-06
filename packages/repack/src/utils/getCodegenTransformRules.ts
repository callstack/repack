/**
 * Returns `module.rules` configuration for handling React Native codegen transformation.
 * This is required for projects using React Native New Architecture.
 *
 * @returns Array of module rules
 */
export function getCodegenTransformRules() {
  return [
    {
      type: 'javascript/auto',
      test: /(?:^|[\\/])(?:Native\w+|(\w+)NativeComponent)\.[jt]sx?$/,
      // Run before Flow stripping so codegen can read the type definitions.
      use: {
        loader: 'babel-loader',
        options: {
          babelrc: false,
          configFile: false,
          parserOpts: {
            // Previous transforms may strip the Flow pragma from JS specs.
            flow: 'all',
          },
          plugins: [
            '@callstack/repack/babel-plugin-syntax-react-native',
            ['@babel/plugin-syntax-typescript', false],
            '@react-native/babel-plugin-codegen',
          ],
          // config merging reference: https://babeljs.io/docs/options#pluginpreset-entries
          overrides: [
            {
              test: /\.ts$/,
              plugins: [
                [
                  '@babel/plugin-syntax-typescript',
                  { isTSX: false, allowNamespaces: true },
                ],
              ],
            },
            {
              test: /\.tsx$/,
              plugins: [
                [
                  '@babel/plugin-syntax-typescript',
                  { isTSX: true, allowNamespaces: true },
                ],
              ],
            },
          ],
          // source maps are usually set based on the devtool option in config
          // Re.Pack templates disable the devtool by default and the flag in loader is not set
          // we need to enable sourcemaps for the loader explicitly here
          sourceMaps: true,
        },
      },
    },
  ];
}
