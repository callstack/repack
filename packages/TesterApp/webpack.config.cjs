// @ts-check
const path = require('path');
const Repack = require('@callstack/repack');

/** @type {(env: any) => import('@rspack/core').Configuration} */
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
  const dirname = context;

  if (!platform) {
    throw new Error('Missing platform');
  }

  return {
    mode,
    devtool: false,
    context,
    entry: [
      ...Repack.getInitializationEntries(reactNativePath, {
        hmr: devServer && devServer.hmr,
      }),
      entry,
    ],
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
    },
    optimization: {
      minimize,
      chunkIds: 'named',
    },
    module: {
      rules: [
        Repack.REACT_NATIVE_LOADING_RULES,
        Repack.NODE_MODULES_LOADING_RULES,
        {
          test: /\.[jt]sx?$/,
          exclude: /node_modules/,
          use: {
            loader: 'builtin:swc-loader',
            options: {
              env: {
                targets: 'edge 18',
                include: [
                  'transform-arrow-functions',
                  'transform-block-scoping',
                  'transform-classes',
                  'transform-unicode-regex',
                ],
              },
              jsc: {
                externalHelpers: false,
                transform: {
                  react: {
                    development: mode === 'development',
                    refresh: mode === 'development' && Boolean(devServer),
                  },
                },
              },
            },
          },
        },
        /**
         * This loader handles all static assets (images, video, audio and others), so that you can
         * use (reference) them inside your application.
         *
         * If you want to handle specific asset type manually, filter out the extension
         * from `ASSET_EXTENSIONS`, for example:
         * ```
         * Repack.ASSET_EXTENSIONS.filter((ext) => ext !== 'svg')
         * ```
         */
        {
          test: Repack.getAssetExtensionsRegExp(
            Repack.ASSET_EXTENSIONS.filter((ext) => ext !== 'svg')
          ),
          exclude: [
            path.join(dirname, 'src/assetsTest/localAssets'),
            path.join(dirname, 'src/assetsTest/inlineAssets'),
            path.join(dirname, 'src/assetsTest/remoteAssets'),
          ],
          use: {
            loader: '@callstack/repack/assets-loader',
            options: {
              platform,
              devServerEnabled: Boolean(devServer),
              /**
               * Defines which assets are scalable - which assets can have
               * scale suffixes: `@1x`, `@2x` and so on.
               * By default all images are scalable.
               */
              scalableAssetExtensions: Repack.SCALABLE_ASSETS,
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
          include: [path.join(dirname, 'src/assetsTest/localAssets')],
          use: {
            loader: '@callstack/repack/assets-loader',
            options: {
              platform,
              devServerEnabled: Boolean(devServer),
              scalableAssetExtensions: Repack.SCALABLE_ASSETS,
            },
          },
        },
        {
          test: Repack.getAssetExtensionsRegExp(
            Repack.ASSET_EXTENSIONS.filter((ext) => ext !== 'svg')
          ),
          include: [path.join(dirname, 'src/assetsTest/inlineAssets')],
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
        {
          test: Repack.getAssetExtensionsRegExp(
            Repack.ASSET_EXTENSIONS.filter((ext) => ext !== 'svg')
          ),
          include: [path.join(dirname, 'src/assetsTest/remoteAssets')],
          use: {
            loader: '@callstack/repack/assets-loader',
            options: {
              platform,
              devServerEnabled: Boolean(devServer),
              scalableAssetExtensions: Repack.SCALABLE_ASSETS,
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
    ],
  };
};
