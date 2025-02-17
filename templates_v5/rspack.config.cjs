const Repack = require('@callstack/repack');

/**
 * Rspack configuration enhanced with Re.Pack defaults for React Native.
 *
 * Learn about Rspack configuration: https://rspack.dev/config/
 * Learn about Re.Pack configuration: https://re-pack.dev/docs/guides/configuration
 */

module.exports = {
  context: __dirname,
  entry: './index.js',
  resolve: {
    ...Repack.getResolveOptions(),
  },
  module: {
    rules: [
      ...Repack.getJsTransformRules(),
      {
        test: Repack.getAssetExtensionsRegExp(),
        use: '@callstack/repack/assets-loader',
      },
    ],
  },
  plugins: [new Repack.RepackPlugin()],
};
