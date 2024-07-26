// @ts-check
/** @type {import('node:path')} */
const path = require('node:path');
/** @type {import('@callstack/repack')} */
const Repack = require('@callstack/repack');
/** @type {import('@rsdoctor/rspack-plugin')} */
const { RsdoctorRspackPlugin } = require('@rsdoctor/rspack-plugin');

/** @type {(env: import('@callstack/repack').EnvOptions) => import('@rspack/core').Configuration} */
export default (env) => {
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

  process.env.BABEL_ENV = mode;

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
      path: path.join(__dirname, 'build', 'host-app', platform),
      filename: 'index.bundle',
      chunkFilename: '[name].chunk.bundle',
      publicPath: Repack.getPublicPath({ platform, devServer }),
      uniqueName: 'MFTester-HostApp',
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
        /* Codebase rules */
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
        Repack.REACT_NATIVE_CODEGEN_RULES,
        {
          test: Repack.getAssetExtensionsRegExp(Repack.ASSET_EXTENSIONS),
          use: {
            loader: '@callstack/repack/assets-loader',
            options: {
              platform,
              devServerEnabled: Boolean(devServer),
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
        },
        extraChunks: [
          {
            include: /.*/,
            type: 'remote',
            outputPath: `build/host-app/${platform}/output-remote`,
          },
        ],
      }),
      new Repack.plugins.ModuleFederationPlugin({
        name: 'HostApp',
        shared: {
          react: {
            singleton: true,
            eager: true,
            requiredVersion: '18.2.0',
          },
          'react-native': {
            singleton: true,
            eager: true,
            requiredVersion: '0.74.3',
          },
          '@react-navigation/native': {
            singleton: true,
            eager: true,
            requiredVersion: '^6.1.18',
          },
          '@react-navigation/native-stack': {
            singleton: true,
            eager: true,
            requiredVersion: '^6.10.1',
          },
          'react-native-safe-area-context': {
            singleton: true,
            eager: true,
            requiredVersion: '^4.10.8',
          },
          'react-native-screens': {
            singleton: true,
            eager: true,
            requiredVersion: '^3.32.0',
          },
        },
      }),
      new webpack.EnvironmentPlugin({ MF_CACHE: false }),
      process.env.RSDOCTOR && new RsdoctorRspackPlugin(),
    ].filter(Boolean),
  };
};
