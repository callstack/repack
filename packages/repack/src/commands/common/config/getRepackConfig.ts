export function getRepackConfig() {
  return {
    devtool: 'source-map',
    output: {
      publicPath: 'noop:///',
    },
    optimization: {
      chunkIds: 'named',
    },
  };
}
