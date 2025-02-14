import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Repack from '@callstack/repack';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * More documentation, installation, usage, motivation and differences with Metro is available at:
 * https://github.com/callstack/repack/blob/main/README.md
 *
 * The API documentation for the functions and plugins used in this file is available at:
 * https://re-pack.dev
 */

export default {
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
