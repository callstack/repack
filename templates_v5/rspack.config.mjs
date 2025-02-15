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
      ...Repack.getJsTransformRules(),
      {
        test: Repack.getAssetExtensionsRegExp(),
        use: '@callstack/repack/assets-loader',
      },
    ],
  },
  plugins: [new Repack.RepackPlugin()],
};
