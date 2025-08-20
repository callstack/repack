import { getMinimizerConfig } from './getMinimizerConfig.js';

function getExperimentsConfig(bundler: 'rspack' | 'webpack') {
  if (bundler === 'rspack') {
    return { parallelLoader: true };
  }
}

export async function getRepackConfig(
  bundler: 'rspack' | 'webpack',
  rootDir: string
) {
  const experiments = getExperimentsConfig(bundler);
  const minimizerConfiguration = await getMinimizerConfig(bundler, rootDir);

  return {
    devtool: 'source-map',
    experiments,
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
