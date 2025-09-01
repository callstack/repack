import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as Repack from '@callstack/repack';
import { ExpoPlugin } from '@callstack/repack-plugin-expo';
import { IgnorePlugin } from '@rspack/core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const require = createRequire(import.meta.url);

export default Repack.defineRspackConfig({
  context: __dirname,
  entry: './index.js',
  resolve: {
    ...Repack.getResolveOptions({ enablePackageExports: true }),
    alias: {
      // Alias both react and react-native to ensure that we don't end up with multiple versions
      // of these libraries in the bundle.
      //
      // This is needed in these monorepo setups where there are multiple copies of react
      // and react-native in the node_modules.
      react: require.resolve('react'),
      'react-native': require.resolve('react-native'),
    },
  },
  module: {
    rules: [
      ...Repack.getJsTransformRules(),
      ...Repack.getAssetTransformRules(),
    ],
  },
  plugins: [
    new Repack.RepackPlugin(),
    new ExpoPlugin({
      router: {
        root: resolve('./src/screens'),
      },
    }),

    // Ignore @react-native-masked-view warnings
    new IgnorePlugin({ resourceRegExp: /^@react-native-masked-view/ }),
  ],
});
