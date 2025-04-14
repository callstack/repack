import path from 'node:path';
import * as Repack from '@callstack/repack';
import { NativeWindPlugin } from '@callstack/repack-plugin-nativewind';
import { ReanimatedPlugin } from '@callstack/repack-plugin-reanimated';
import TerserPlugin from 'terser-webpack-plugin';

const dirname = Repack.getDirname(import.meta.url);

export default (env) => {
  const {
    mode = 'development',
    context = dirname,
    entry = './index.js',
    platform = process.env.PLATFORM,
  } = env;

  if (!platform) {
    throw new Error('Missing platform');
  }

  return {
    mode,
    context,
    cache: process.env.USE_CACHE
      ? {
          type: 'filesystem',
          name: `${platform}-${mode}`,
        }
      : undefined,
    entry,
    resolve: {
      ...Repack.getResolveOptions({ enablePackageExports: true }),
    },
    output: {
      uniqueName: 'tester-app',
    },
    optimization: {
      minimizer: [
        new TerserPlugin({
          test: /\.(js)?bundle(\?.*)?$/i,
          extractComments: false,
          terserOptions: {
            format: {
              comments: false,
            },
          },
        }),
      ],
    },
    module: {
      rules: [
        {
          test: /\.[cm]?[jt]sx?$/,
          use: 'babel-loader',
          type: 'javascript/auto',
        },
        {
          test: Repack.getAssetExtensionsRegExp(
            Repack.ASSET_EXTENSIONS.filter((ext) => ext !== 'svg')
          ),
          exclude: [
            path.join(context, 'src/assetsTest/localAssets'),
            path.join(context, 'src/assetsTest/inlineAssets'),
            path.join(context, 'src/assetsTest/remoteAssets'),
          ],
          use: '@callstack/repack/assets-loader',
        },
        {
          test: /\.svg$/,
          use: [
            {
              loader: '@svgr/webpack',
              options: {
                native: true,
                dimensions: false,
              },
            },
          ],
        },
        {
          test: Repack.getAssetExtensionsRegExp(
            Repack.ASSET_EXTENSIONS.filter((ext) => ext !== 'svg')
          ),
          include: [path.join(context, 'src/assetsTest/localAssets')],
          use: '@callstack/repack/assets-loader',
        },
        {
          test: Repack.getAssetExtensionsRegExp(
            Repack.ASSET_EXTENSIONS.filter((ext) => ext !== 'svg')
          ),
          include: [path.join(context, 'src/assetsTest/inlineAssets')],
          use: {
            loader: '@callstack/repack/assets-loader',
            options: { inline: true },
          },
        },
        {
          test: Repack.getAssetExtensionsRegExp(
            Repack.ASSET_EXTENSIONS.filter((ext) => ext !== 'svg')
          ),
          include: [path.join(context, 'src/assetsTest/remoteAssets')],
          use: {
            loader: '@callstack/repack/assets-loader',
            options: {
              remote: {
                enabled: true,
                publicPath: 'http://localhost:9999/remote-assets',
              },
            },
          },
        },
      ],
    },
    plugins: [
      new Repack.RepackPlugin({
        output: {
          auxiliaryAssetsPath: path.join('build/output', platform, 'remote'),
        },
        extraChunks: [
          {
            include: /.+local.+/,
            type: 'local',
          },
          {
            exclude: /.+local.+/,
            type: 'remote',
            outputPath: path.join('build/output', platform, 'remote'),
          },
        ],
      }),
      new ReanimatedPlugin(),
      new NativeWindPlugin(),
      // new Repack.plugins.HermesBytecodePlugin({
      //   enabled: mode === 'production',
      //   test: /\.(js)?bundle$/,
      //   exclude: /index.bundle$/,
      // }),
    ],
  };
};
