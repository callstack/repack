import { createRequire } from 'node:module';
import path from 'node:path';
import * as Repack from '@callstack/repack';
import { NativeWindPlugin } from '@callstack/repack-plugin-nativewind';
import { ReanimatedPlugin } from '@callstack/repack-plugin-reanimated';
import TerserPlugin from 'terser-webpack-plugin';

const dirname = Repack.getDirname(import.meta.url);
const { resolve } = createRequire(import.meta.url);

export default (env) => {
  const {
    mode = 'development',
    context = dirname,
    entry = './index.js',
    platform = process.env.PLATFORM,
    minimize = mode === 'production',
    devServer = undefined,
    bundleFilename = undefined,
    sourceMapFilename = undefined,
    assetsPath = undefined,
    reactNativePath = resolve('react-native'),
  } = env;

  if (!platform) {
    throw new Error('Missing platform');
  }

  return {
    mode,
    devtool: false,
    context,
    experiments: process.env.LAZY_COMPILATION
      ? {
          lazyCompilation: devServer && {
            imports: true,
            entries: false,
          },
        }
      : undefined,
    cache: process.env.NO_CACHE
      ? undefined
      : {
          type: 'filesystem',
          name: `${platform}-${mode}`,
        },
    entry,
    resolve: {
      ...Repack.getResolveOptions(platform),
      alias: {
        'react-native': reactNativePath,
      },
    },
    output: {
      clean: true,
      hashFunction: 'xxhash64',
      path: path.join(dirname, 'build/generated', platform),
      filename: 'index.bundle',
      chunkFilename: '[name].chunk.bundle',
      publicPath: Repack.getPublicPath({ platform, devServer }),
      uniqueName: 'tester-app',
    },
    optimization: {
      minimize,
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
      chunkIds: 'named',
    },
    module: {
      rules: [
        {
          test: /\.[cm]?[jt]sx?$/,
          include: [
            /node_modules(.*[/\\])+react-native/,
            /node_modules(.*[/\\])+@react-native/,
            /node_modules(.*[/\\])+@react-navigation/,
            /node_modules(.*[/\\])+@react-native-community/,
            /node_modules(.*[/\\])+expo/,
            /node_modules(.*[/\\])+pretty-format/,
            /node_modules(.*[/\\])+metro/,
            /node_modules(.*[/\\])+abort-controller/,
            /node_modules(.*[/\\])+@rn-primitives/,
            /node_modules(.*[/\\])+@callstack[/\\]repack/,
          ],
          use: 'babel-loader',
        },
        {
          test: /\.[jt]sx?$/,
          exclude: /node_modules/,
          use: 'babel-loader',
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
          use: {
            loader: '@callstack/repack/assets-loader',
            options: {
              platform,
              devServerEnabled: Boolean(devServer),
            },
          },
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
          use: {
            loader: '@callstack/repack/assets-loader',
            options: {
              platform,
              devServerEnabled: Boolean(devServer),
            },
          },
        },
        {
          test: Repack.getAssetExtensionsRegExp(
            Repack.ASSET_EXTENSIONS.filter((ext) => ext !== 'svg')
          ),
          include: [path.join(context, 'src/assetsTest/inlineAssets')],
          use: {
            loader: '@callstack/repack/assets-loader',
            options: {
              platform,
              devServerEnabled: Boolean(devServer),
              inline: true,
            },
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
              platform,
              devServerEnabled: Boolean(devServer),
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
        context,
        mode,
        platform,
        devServer,
        output: {
          bundleFilename,
          sourceMapFilename,
          assetsPath,
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
      // new Repack.plugins.ChunksToHermesBytecodePlugin({
      //   enabled: mode === 'production' && !devServer,
      //   test: /\.(js)?bundle$/,
      //   exclude: /index.bundle$/,
      // }),
    ],
  };
};
