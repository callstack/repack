// @ts-check
/** @type {import('node:path')} */
const path = require('node:path');
/** @type {import('@callstack/repack')} */
const Repack = require('@callstack/repack');
/** @type {import('@rsdoctor/rspack-plugin')} */
const { RsdoctorRspackPlugin } = require('@rsdoctor/rspack-plugin');

/** @type {(env: import('@callstack/repack').EnvOptions) => import('@rspack/core').Configuration} */
module.exports = (env) => {
  const {
    mode = 'development',
    context = __dirname,
    entry = './index.js',
    platform = process.env.PLATFORM,
    minimize = mode === 'production',
    devServer = undefined,
    bundleFilename = undefined,
    sourceMapFilename = undefined,
    assetsPath = undefined,
    reactNativePath = require.resolve('react-native'),
  } = env;
  if (!platform) {
    throw new Error('Missing platform');
  }

  return {
    mode,
    devtool: false,
    context,
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
      path: path.join(context, 'build/generated', platform),
      filename: 'index.bundle',
      chunkFilename: '[name].chunk.bundle',
      publicPath: Repack.getPublicPath({ platform, devServer }),
    },
    optimization: {
      minimize,
      chunkIds: 'named',
    },
    module: {
      rules: [
        {
          test: Repack.getAssetExtensionsRegExp(
            Repack.ASSET_EXTENSIONS.filter((ext) => ext !== 'svg')
          ),
          exclude: [
            path.join(context, 'src/assetsTest/localAssets'),
            path.join(context, 'src/assetsTest/inlineAssets'),
            path.join(context, 'src/assetsTest/remoteAssets'),
          ],
          type: 'asset',
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
          type: 'asset',
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
          type: 'asset',
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
          type: 'asset',
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
      /**
       * Configure other required and additional plugins to make the bundle
       * work in React Native and provide good development experience with
       * sensible defaults.
       *
       * `Repack.RepackPlugin` provides some degree of customization, but if you
       * need more control, you can replace `Repack.RepackPlugin` with plugins
       * from `Repack.plugins`.
       */
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
      // new Repack.plugins.ChunksToHermesBytecodePlugin({
      //   enabled: mode === 'production' && !devServer,
      //   test: /\.(js)?bundle$/,
      //   exclude: /index.bundle$/,
      // }),
      process.env.RSDOCTOR && new RsdoctorRspackPlugin(),
    ].filter(Boolean),
  };
};
