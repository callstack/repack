const path = require('path');
const Repack = require('@callstack/repack');
const rspack = require('@rspack/core');

module.exports = (env) => {
  const {
    mode = 'development',
    context = __dirname,
    entry = './index.js',
    platform = process.env.PLATFORM,
    devServer = undefined,
    reactNativePath = require.resolve('react-native'),
  } = env;

  if (!platform) {
    throw new Error('Missing platform');
  }

  return {
    mode,
    devtool: false, // source maps are not working at the moment - area of active research
    context,
    devServer: {
      hot: true,
    },
    watchOptions: {
      ignored: /node_modules/,
      poll: 100, // polling gives better result,
    },
    entry: [
      ...Repack.getInitializationEntries(reactNativePath, {
        hmr: true,
      }),
      entry,
    ],
    resolve: {
      ...Repack.getResolveOptions(platform),
      alias: {
        // this is here probably so it works in monorepos?
        'react-native': reactNativePath,
        // simulate target environment, because of symlinks this get's picked up by the loader that handles local source code
        '@callstack/repack': path.join(
          __dirname,
          'node_modules/@callstack/repack/src/index.ts'
        ),
      },
    },
    output: {
      clean: false,
      path: path.join(__dirname, 'build/generated', platform),
      filename: 'index.bundle',
      chunkFilename: '[name].chunk.bundle',
      publicPath: Repack.getPublicPath({ platform, devServer }),
    },
    module: {
      rules: [
        ...Repack.getDefaultLoaders(), // loaders for: RN, React and all other node_modules
        {
          test: /\.[jt]sx?$/,
          exclude: /node_modules/,
          use: {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                target: 'es5',
                externalHelpers: true, // equivalent of @babel/runtime
              },
              rspackExperiments: {
                react: {
                  development: true, // this is needed for React Devtools probably
                  refresh: true, // add fast refresh transform to the code
                },
              },
            },
          },
        },
        {
          test: Repack.getAssetExtensionsRegExp(
            Repack.ASSET_EXTENSIONS.filter((ext) => ext !== 'svg')
          ),
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
      ],
    },
    plugins: [
      new Repack.RepackPlugin({
        context,
        mode,
        platform,
        devServer,
      }),
      // TODO add this to Development Plugin
      new rspack.ProvidePlugin({
        $ReactRefreshRuntime$: [
          require.resolve('@rspack/plugin-react-refresh/react-refresh'),
        ],
      }),
    ],
  };
};
