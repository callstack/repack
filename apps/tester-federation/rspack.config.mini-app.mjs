// @ts-check
import { createRequire } from 'node:module';
import path from 'node:path';
import rspack from '@rspack/core';
import * as Repack from '@callstack/repack';
import { RsdoctorRspackPlugin } from '@rsdoctor/rspack-plugin';

const dirname = Repack.getDirname(import.meta.url);
const { resolve } = createRequire(import.meta.url);

/** @type {(env: import('@callstack/repack').EnvOptions) => import('@rspack/core').Configuration} */
module.exports = (env) => {
  const {
    mode = 'development',
    context = dirname,
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
    entry: {},
    resolve: {
      ...Repack.getResolveOptions(platform),
      alias: {
        'react-native': reactNativePath,
      },
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
        Repack.REACT_NATIVE_LOADING_RULES,
        Repack.NODE_MODULES_LOADING_RULES,
        /* repack is symlinked to a local workspace */
        {
          test: /\.[jt]sx?$/,
          type: 'javascript/auto',
          include: [/repack[/\\]dist/],
          use: {
            loader: 'builtin:swc-loader',
            options: {
              env: { targets: { 'react-native': '0.74' } },
              jsc: { externalHelpers: true },
            },
          },
        },
        /* codebase rules */
        {
          test: /\.[jt]sx?$/,
          type: 'javascript/auto',
          exclude: [/node_modules/, /repack[/\\]dist/],
          use: {
            loader: 'builtin:swc-loader',
            /** @type {import('@rspack/core').SwcLoaderOptions} */
            options: {
              sourceMaps: true,
              env: {
                targets: { 'react-native': '0.74' },
              },
              jsc: {
                externalHelpers: true,
                transform: {
                  react: {
                    runtime: 'automatic',
                  },
                },
              },
            },
          },
        },
        // Repack.REACT_NATIVE_CODEGEN_RULES,
        {
          test: Repack.getAssetExtensionsRegExp(Repack.ASSET_EXTENSIONS),
          use: {
            loader: '@callstack/repack/assets-loader',
            options: {
              platform,
              devServerEnabled: Boolean(devServer),
              inline: true,
            },
          },
        },
      ],
    },
    plugins: [
      new rspack.IgnorePlugin({ resourceRegExp: /@react-native-masked-view/ }),
      new Repack.RepackPlugin({
        context,
        mode,
        platform,
        devServer,
        output: {
          bundleFilename,
          sourceMapFilename,
          assetsPath,
        },
        extraChunks: [
          {
            include: /.*/,
            type: 'remote',
            outputPath: `build/mini-app/${platform}/output-remote`,
          },
        ],
      }),
      new Repack.plugins.ModuleFederationPlugin({
        name: 'MiniApp',
        exposes: {
          './MiniAppNavigator': './src/mini/navigation/MainNavigator',
        },
        shared: {
          react: {
            singleton: true,
            eager: false,
            requiredVersion: '18.2.0',
          },
          'react-native': {
            singleton: true,
            eager: false,
            requiredVersion: '0.74.3',
          },
          'react-native/Libraries/Core/Devtools/getDevServer': {
            singleton: true,
            eager: true,
            requiredVersion: '0.74.3',
            shareScope: 'internal',
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
      process.env.RSDOCTOR && new RsdoctorRspackPlugin(),
    ].filter(Boolean),
  };
};
