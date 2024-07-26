// @ts-check
/** @type {import('node:path')} */
const path = require('node:path');
/** @type {import('@rspack/core')} */
const rspack = require('@rspack/core');
/** @type {import('@callstack/repack')} */
const Repack = require('@callstack/repack');
/** @type {import('@rsdoctor/rspack-plugin')} */
const { RsdoctorRspackPlugin } = require('@rsdoctor/rspack-plugin');

/** @type {(env: import('@callstack/repack').EnvOptions) => import('@rspack/core').Configuration} */
module.exports = (env) => {
  const {
    mode = 'development',
    context = __dirname,
    platform = process.env.PLATFORM,
    minimize = mode === 'production',
    devServer = undefined,
    reactNativePath = require.resolve('react-native'),
    bundleFilename,
    sourceMapFilename,
    assetsPath,
  } = env;

  if (!platform) {
    throw new Error('Missing platform');
  }

  process.env.BABEL_ENV = mode;

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
      path: path.join(__dirname, 'build', 'mini-app', platform),
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
                    development: mode === 'development',
                    refresh: mode === 'development' && Boolean(devServer),
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
