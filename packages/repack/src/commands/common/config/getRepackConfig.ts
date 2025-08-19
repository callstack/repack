import semver from 'semver';

// prefer `terser-webpack-plugin` installed in the project root to the one shipped with Re.Pack
async function getTerserPlugin(rootDir: string) {
  let terserPluginPath: string;
  try {
    terserPluginPath = require.resolve('terser-webpack-plugin', {
      paths: [rootDir],
    });
  } catch {
    terserPluginPath = require.resolve('terser-webpack-plugin');
  }
  const plugin = await import(terserPluginPath);
  return 'default' in plugin ? plugin.default : plugin;
}

async function getTerserConfig(rootDir: string) {
  const TerserPlugin = await getTerserPlugin(rootDir);
  return new TerserPlugin({
    test: /\.(js)?bundle(\?.*)?$/i,
    extractComments: false,
    terserOptions: {
      format: { comments: false },
    },
  });
}

// use SwcJsMinimizerRspackPlugin for Rspack 1.5.0 and above
function shouldUseTerserForRspack(rspackVersion: string): boolean {
  const version = semver.coerce(rspackVersion) ?? '0.0.0';
  return semver.lt(version, '1.5.0');
}

async function getWebpackMinimizer(rootDir: string) {
  return [await getTerserConfig(rootDir)];
}

async function getRspackMinimizer(rootDir: string) {
  const rspack = await import('@rspack/core');
  return [
    shouldUseTerserForRspack(rspack.rspackVersion)
      ? await getTerserConfig(rootDir)
      : new rspack.SwcJsMinimizerRspackPlugin({
          test: /\.(js)?bundle(\?.*)?$/i,
          extractComments: false,
          minimizerOptions: {
            format: { comments: false },
          },
        }),
  ];
}

export async function getRepackConfig(
  bundler: 'rspack' | 'webpack',
  rootDir: string
) {
  const minimizerConfiguration =
    bundler === 'rspack'
      ? await getRspackMinimizer(rootDir)
      : await getWebpackMinimizer(rootDir);

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
