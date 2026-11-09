import { getMinimizerConfig } from './getMinimizerConfig.js';

function getModuleConfig(bundler: 'rspack' | 'webpack') {
  if (bundler === 'rspack') {
    // Rspack 2 defaults to 'error', which fails builds on the broken
    // re-exports some React Native libraries ship. Match webpack instead.
    return { parser: { javascript: { exportsPresence: 'auto' } } };
  }
}

export async function getRepackConfig(
  bundler: 'rspack' | 'webpack',
  rootDir: string
) {
  const moduleConfig = getModuleConfig(bundler);
  const minimizerConfiguration = await getMinimizerConfig(rootDir);

  return {
    devtool: 'source-map',
    module: moduleConfig,
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
