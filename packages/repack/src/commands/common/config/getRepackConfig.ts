export function getRepackConfig() {
  return {
    devtool: 'source-map',
    output: {
      clean: true,
      hashFunction: 'xxhash64',
      filename: 'index.bundle',
      chunkFilename: '[name].chunk.bundle',
      publicPath: 'noop:///',
    },
    optimization: {
      chunkIds: 'named',
    },
  };
}
