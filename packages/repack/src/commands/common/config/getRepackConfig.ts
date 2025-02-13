export function getRepackConfig() {
  return {
    devtool: 'source-map',
    output: {
      publicPath: 'noop:///',
    },
  };
}
