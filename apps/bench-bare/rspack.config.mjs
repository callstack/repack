import path from 'node:path';
import * as Repack from '@callstack/repack';

const dirname = Repack.getDirname(import.meta.url);

// The config `@callstack/repack-init` installs (templates/rspack.config.mjs),
// plus an output path for the benchmark and its opt-in persistent cache variant.
export default Repack.defineRspackConfig((env) => ({
  context: dirname,
  entry: './index.js',
  resolve: {
    ...Repack.getResolveOptions({ enablePackageExports: true }),
  },
  output: {
    path:
      process.env.BENCH_OUTPUT_DIR ??
      path.join(dirname, 'build', 'rspack', env.platform),
  },
  module: {
    rules: [
      {
        test: /\.[cm]?[jt]sx?$/,
        type: 'javascript/auto',
        use: {
          loader: '@callstack/repack/babel-swc-loader',
          parallel: true,
          options: {},
        },
      },
      ...Repack.getAssetTransformRules(),
    ],
  },
  plugins: [new Repack.RepackPlugin()],
  // Metro caches transforms by default; this is the equivalent opt-in.
  ...(process.env.BENCH_RSPACK_CACHE && {
    cache: true,
    experiments: {
      cache: {
        type: 'persistent',
        storage: {
          type: 'filesystem',
          directory: path.join(dirname, 'node_modules/.cache/rspack'),
        },
      },
    },
  }),
}));
