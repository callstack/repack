import { createRequire } from 'node:module';
import path from 'node:path';
import * as Repack from '@callstack/repack';
import { ModuleFederationPlugin } from '@module-federation/enhanced/webpack';
import webpack from 'webpack';

const dirname = Repack.getDirname(import.meta.url);
const { resolve } = createRequire(import.meta.url);

export default (env) => {
  const {
    mode = 'development',
    context = dirname,
    platform = process.env.PLATFORM,
    minimize = mode === 'production',
    devServer = undefined,
  } = env;

  if (!platform) {
    throw new Error('Missing platform');
  }

  process.env.BABEL_ENV = mode;

  return {
    mode,
    devtool: false,
    context,
    entry: [
      resolve('@callstack/repack/dist/modules/configurePublicPath'),
      resolve('@callstack/repack/dist/modules/WebpackHMRClient'),
    ],
    resolve: {
      ...Repack.getResolveOptions(platform),
    },
    output: {
      clean: true,
      hashFunction: 'xxhash64',
      path: path.join(dirname, 'build', 'mini-app', platform),
      filename: 'index.bundle',
      chunkFilename: '[name].chunk.bundle',
      publicPath: Repack.getPublicPath({ platform, devServer }),
      uniqueName: 'MFTester-MiniApp',
    },
    optimization: {
      minimize,
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
            /node_modules(.*[/\\])+react-freeze/,
            /node_modules(.*[/\\])+expo/,
            /node_modules(.*[/\\])+pretty-format/,
            /node_modules(.*[/\\])+metro/,
            /node_modules(.*[/\\])+abort-controller/,
            /node_modules(.*[/\\])+@callstack[/\\]repack/,
            /node_modules(.*[/\\])+@module-federation/,
          ],
          use: 'babel-loader',
        },
        {
          test: /\.[jt]sx?$/,
          exclude: /node_modules/,
          use: 'babel-loader',
        },
        {
          test: Repack.getAssetExtensionsRegExp(Repack.ASSET_EXTENSIONS),
          use: {
            loader: '@callstack/repack/assets-loader',
            options: {
              platform,
              devServerEnabled: Boolean(devServer),
              scalableAssetExtensions: Repack.SCALABLE_ASSETS,
              inline: true,
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
        output: {},
      }),
      new ModuleFederationPlugin({
        name: 'MiniApp',
        filename: 'MiniApp.container.js.bundle',
        exposes: {
          './MiniAppNavigator': './src/mini/navigation/MainNavigator',
        },
        getPublicPath: `return "http://localhost:8082/${platform}/"`,
        shared: {
          react: {
            singleton: true,
            eager: false,
            requiredVersion: '18.2.0',
          },
          'react/': {
            singleton: true,
            eager: false,
            requiredVersion: '18.2.0',
          },
          'react-native': {
            singleton: true,
            eager: false,
            requiredVersion: '0.74.3',
          },
          'react-native/': {
            singleton: true,
            eager: false,
            requiredVersion: '0.74.3',
          },
          '@react-navigation/native': {
            singleton: true,
            eager: false,
            requiredVersion: '^6.1.18',
          },
          '@react-navigation/native-stack': {
            singleton: true,
            eager: false,
            requiredVersion: '^6.10.1',
          },
          'react-native-safe-area-context': {
            singleton: true,
            eager: false,
            requiredVersion: '^4.10.8',
          },
          'react-native-screens': {
            singleton: true,
            eager: false,
            requiredVersion: '^3.32.0',
          },
        },
      }),
      // silence missing @react-native-masked-view optionally required by @react-navigation/elements
      new webpack.IgnorePlugin({
        resourceRegExp: /^@react-native-masked-view/,
      }),
    ],
  };
};