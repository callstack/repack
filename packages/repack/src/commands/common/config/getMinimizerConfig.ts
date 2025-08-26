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

// use SwcJsMinimizerRspackPlugin for Rspack 1.4.11
// Rspack 1.5.0 broke the minimizer again, pending a fix
function shouldUseTerserForRspack(rspackVersion: string): boolean {
  const version = semver.coerce(rspackVersion) ?? '0.0.0';
  return !semver.eq(version, '1.4.11');
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

export async function getMinimizerConfig(
  bundler: 'rspack' | 'webpack',
  rootDir: string
) {
  return bundler === 'rspack'
    ? getRspackMinimizer(rootDir)
    : getWebpackMinimizer(rootDir);
}
