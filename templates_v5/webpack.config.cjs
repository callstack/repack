const Repack = require('@callstack/repack');
const TerserPlugin = require('terser-webpack-plugin');

/**
 * Webpack configuration enhanced with Re.Pack defaults for React Native.
 *
 * Learn about webpack configuration: https://webpack.js.org/configuration/
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
      {
        test: /\.[cm]?[jt]sx?$/,
        use: 'babel-loader',
        type: 'javascript/auto',
      },
      {
        test: Repack.getAssetExtensionsRegExp(),
        use: '@callstack/repack/assets-loader',
      },
    ],
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        test: /\.(js)?bundle(\?.*)?$/i,
        extractComments: false,
        terserOptions: {
          format: {
            comments: false,
          },
        },
      }),
    ],
  },
  plugins: [new Repack.RepackPlugin()],
};
