import TerserPlugin from 'terser-webpack-plugin';

export function getRepackConfig() {
  return {
    devtool: 'source-map',
    output: {
      clean: true,
      hashFunction: 'xxhash64',
      filename: 'index.bundle',
      chunkFilename: '[name].chunk.bundle',
      path: '[context]/build/generated/[platform]',
      publicPath: 'noop:///',
    },
    optimization: {
      chunkIds: 'named',
      minimizer: [
        // TODO: remove this default in favour explicit configuration in webpack
        // and implicit configuration in rspack using SwcJsMinimizerRspackPlugin
        // once https://github.com/web-infra-dev/rspack/issues/11183 is resolved
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
  };
}
