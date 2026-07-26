import { getRspackMajorVersion } from '../../../helpers/index.js';
import { getMinimizerConfig } from './getMinimizerConfig.js';

function getExperimentsConfig(bundler: 'rspack' | 'webpack', rootDir: string) {
  if (bundler === 'rspack') {
    const rspackMajor = getRspackMajorVersion(rootDir) ?? 1;
    if (rspackMajor < 2) {
      return { parallelLoader: true };
    }
    // Rspack 2 removed `experiments.parallelLoader` (parallel loading is
    // stable and opt-in per rule via `use[].parallel`) - nothing to set.
  }
}

function getModuleConfig(bundler: 'rspack' | 'webpack', rootDir: string) {
  if (bundler === 'rspack') {
    const rspackMajor = getRspackMajorVersion(rootDir) ?? 1;
    if (rspackMajor >= 2) {
      // Rspack 2 changed the `exportsPresence` default from 'warn' to 'error',
      // which breaks builds on invalid imports inside node_modules - a common
      // occurrence in the React Native ecosystem that Metro tolerates.
      // Restore Metro-like leniency by default; users can override this
      // in their project config.
      return {
        parser: { javascript: { exportsPresence: 'auto' as const } },
      };
    }
  }
}

export async function getRepackConfig(
  bundler: 'rspack' | 'webpack',
  rootDir: string
) {
  const experiments = getExperimentsConfig(bundler, rootDir);
  const moduleConfiguration = getModuleConfig(bundler, rootDir);
  const minimizerConfiguration = await getMinimizerConfig(bundler, rootDir);

  return {
    devtool: 'source-map',
    experiments,
    module: moduleConfiguration,
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
