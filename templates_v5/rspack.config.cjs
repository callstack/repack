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
      Repack.REACT_NATIVE_LOADING_RULES,
      Repack.NODE_MODULES_LOADING_RULES,
      Repack.FLOW_TYPED_MODULES_LOADING_RULES,
      {
        test: /\.[jt]sx?$/,
        exclude: [/node_modules/],
        type: 'javascript/auto',
        use: {
          loader: 'builtin:swc-loader',
          options: {
            env: {
              targets: {
                'react-native': '0.74',
              },
            },
            jsc: {
              assumptions: {
                setPublicClassFields: true,
                privateFieldsAsProperties: true,
              },
              externalHelpers: true,
              transform: {
                react: {
                  runtime: 'automatic',
                  development: mode === 'development',
                },
              },
            },
          },
        },
      },
      {
        test: Repack.getAssetExtensionsRegExp(),
        use: '@callstack/repack/assets-loader',
      },
    ],
  },
  plugins: [new Repack.RepackPlugin()],
};
