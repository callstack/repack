import semver from 'semver';
import type TerserPlugin from 'terser-webpack-plugin';
import { importDefaultESM } from '../../../helpers/index.js';

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
  const plugin = await importDefaultESM<typeof TerserPlugin>(terserPluginPath);
  return plugin;
}

type TerserMinifyArgs = Parameters<(typeof TerserPlugin)['terserMinify']>;

// since 5.6.0 the plugin's own `terserMinify` carries a `.filter` that rejects `.bundle`
// assets; a wrapper carries none. It runs in a worker, so it must stay self-contained.
function repackTerserMinify(
  input: TerserMinifyArgs[0],
  sourceMap: TerserMinifyArgs[1],
  minimizerOptions: TerserMinifyArgs[2],
  extractComments: TerserMinifyArgs[3]
) {
  return require('terser-webpack-plugin').terserMinify(
    input,
    sourceMap,
    minimizerOptions,
    extractComments
  );
}

// read on the main thread only, to keep terser's version in the chunk hash
repackTerserMinify.getMinimizerVersion = () =>
  require('terser-webpack-plugin').terserMinify.getMinimizerVersion?.();

async function getTerserConfig(rootDir: string) {
  const TerserPlugin = await getTerserPlugin(rootDir);
  return new TerserPlugin({
    test: /\.(js)?bundle(\?.*)?$/i,
    extractComments: false,
    minify: repackTerserMinify,
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
