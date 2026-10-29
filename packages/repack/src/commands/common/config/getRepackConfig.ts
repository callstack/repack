import { getMinimizerConfig } from './getMinimizerConfig.js';

export async function getRepackConfig(
  bundler: 'rspack' | 'webpack',
  rootDir: string
) {
  const minimizerConfiguration = await getMinimizerConfig(bundler, rootDir);

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
      minimizer: minimizerConfiguration,
    },
  };
}
