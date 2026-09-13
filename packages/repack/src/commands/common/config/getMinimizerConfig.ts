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
  return { plugin, terserPluginPath };
}

type TerserMinifyArgs = Parameters<(typeof TerserPlugin)['terserMinify']>;

// the resolved plugin path rides along in the serialized `terserOptions` so the
// wrapper can load the same copy from inside a worker
type RepackTerserOptions = TerserMinifyArgs[2] & {
  repackTerserPluginPath: string;
};

// since 5.6.0 the plugin's own `terserMinify` carries a `.filter` that rejects `.bundle`
// assets; a wrapper carries none. The plugin re-evaluates this from source in a
// worker, so it must not reference anything outside its own scope.
function repackTerserMinify(
  input: TerserMinifyArgs[0],
  sourceMap: TerserMinifyArgs[1],
  minimizerOptions: RepackTerserOptions,
  extractComments: TerserMinifyArgs[3]
) {
  const { repackTerserPluginPath, ...terserOptions } = minimizerOptions;
  const plugin: typeof TerserPlugin = require(repackTerserPluginPath);
  return plugin.terserMinify(input, sourceMap, terserOptions, extractComments);
}

async function getTerserConfig(rootDir: string) {
  const { plugin: Plugin, terserPluginPath } = await getTerserPlugin(rootDir);

  // read on the main thread only, to keep terser's version in the chunk hash
  const minify = Object.assign(repackTerserMinify, {
    getMinimizerVersion: () => Plugin.terserMinify.getMinimizerVersion?.(),
  });

  return new Plugin<RepackTerserOptions>({
    test: /\.(js)?bundle(\?.*)?$/i,
    extractComments: false,
    minify,
    terserOptions: {
      format: { comments: false },
      repackTerserPluginPath: terserPluginPath,
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
