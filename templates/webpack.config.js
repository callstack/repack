const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const ReactNative = require('@callstack/repack');

/**
 * More documentation, installation, usage, motivation and differences with Metro is available at:
 * https://github.com/callstack/repack/blob/main/README.md
 *
 * The API documentation for the functions and plugins used in this file is available at:
 * https://re-pack.netlify.app/
 */

/**
 * Webpack configuration.
 * You can also export a static object or a function returning a Promise.
 *
 * @param env Environment options passed from either Webpack CLI or React Native CLI
 *            when running with `react-native start/bundle`.
 */
module.exports = (env) => {
  const {
    mode = 'development',
    context = __dirname,
    entry = './index.js',
    platform,
    minimize = mode === 'production',
    devServer = undefined,
    reactNativePath = require.resolve('react-native'),
  } = env;

  if (!platform) {
    throw new Error('Missing platform');
  }

  /**
   * Depending on your Babel configuration you might want to keep it.
   * If you don't use `env` in your Babel config, you can remove it.
   *
   * Keep in mind that if you remove it you should set `BABEL_ENV` or `NODE_ENV`
   * to `development` or `production`. Otherwise your production code might be compiled with
   * in development mode by Babel.
   */
  process.env.BABEL_ENV = mode;

  return {
    mode,
    /**
     * This should be always `false`, since the Source Map configuration is done
     * by `SourceMapDevToolPlugin`.
     */
    devtool: false,
    context,
    /**
     * `getInitializationEntries` will return necessary entries with setup and initialization code.
     * If you don't want to use Hot Module Replacement, set `hmr` option to `false`. By default,
     * HMR will be enabled in development mode.
     */
    entry: [
      ...ReactNative.getInitializationEntries(reactNativePath, {
        hmr: devServer && devServer.hmr,
      }),
      entry,
    ],
    resolve: {
      /**
       * `getResolveOptions` returns additional resolution configuration for React Native.
       * If it's removed, you won't be able to use `<file>.<platform>.<ext>` (eg: `file.ios.js`)
       * convention and some 3rd-party libraries that specify `react-native` field
       * in their `package.json` might not work correctly.
       */
      ...ReactNative.getResolveOptions(platform),

      /**
       * Uncomment this to ensure all `react-native*` imports will resolve to the same React Native
       * dependency. You might need it when using workspaces/monorepos or unconventional project
       * structure. For simple/typical project you won't need it.
       */
      // alias: {
      //   'react-native': reactNativePath,
      // },
    },
    /**
     * Configures output.
     * It's recommended to leave it as it is unless you know what you're doing.
     * By default Webpack will emit files into the directory specified under `path`. In order for the
     * React Native app use them when bundling the `.ipa`/`.apk`, they need to be copied over with
     * `ReactNative.OutputPlugin`, which is configured by default.
     */
    output: {
      clean: true,
      path: path.join(__dirname, 'build', platform),
      filename: 'index.bundle',
      chunkFilename: '[name].chunk.bundle',
      publicPath: ReactNative.getPublicPath(devServer),
      hotUpdateChunkFilename: `[id].[fullhash].hot-update.${platform}.js`,
      hotUpdateMainFilename: `[runtime].[fullhash].hot-update.${platform}.json`,
    },
    /**
     * Configures optimization of the built bundle.
     */
    optimization: {
      /** Enables minification based on values passed from React Native CLI or from fallback. */
      minimize,
      /** Configure minimizer to process the bundle. */
      minimizer: [
        new TerserPlugin({
          test: /\.(js)?bundle(\?.*)?$/i,
          /**
           * Prevents emitting text file with comments, licenses etc.
           * If you want to gather in-file licenses, feel free to remove this line or configure it
           * differently.
           */
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
      /**
       * This rule will process all React Native related dependencies with Babel.
       * If you have a 3rd-party dependency that you need to transpile, you can add it to the
       * `include` list.
       *
       * You can also enable persistent caching with `cacheDirectory` - please refer to:
       * https://github.com/babel/babel-loader#options
       */
      rules: [
        {
          test: /\.[jt]sx?$/,
          include: [
            /node_modules(.*[/\\])+react/,
            /node_modules(.*[/\\])+@react-native/,
            /node_modules(.*[/\\])+@react-navigation/,
            /node_modules(.*[/\\])+@react-native-community/,
            /node_modules(.*[/\\])+@expo/,
            /node_modules(.*[/\\])+pretty-format/,
            /node_modules(.*[/\\])+metro/,
            /node_modules(.*[/\\])+abort-controller/,
            /node_modules(.*[/\\])+@callstack\/repack/,
          ],
          use: 'babel-loader',
        },
        /**
         * Here you can adjust loader that will process your files.
         *
         * You can also enable persistent caching with `cacheDirectory` - please refer to:
         * https://github.com/babel/babel-loader#options
         */
        {
          test: /\.[jt]sx?$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              /** Add React Refresh transform only when HMR is enabled. */
              plugins:
                devServer && devServer.hmr
                  ? ['module:react-refresh/babel']
                  : undefined,
            },
          },
        },
        /**
         * This loader handles all static assets (images, video, audio and others), so that you can
         * use (reference) them inside your application.
         *
         * If you wan to handle specific asset type manually, filter out the extension
         * from `ASSET_EXTENSIONS`, for example:
         * ```
         * ReactNative.ASSET_EXTENSIONS.filter((ext) => ext !== 'svg')
         * ```
         */
        {
          test: ReactNative.getAssetExtensionsRegExp(
            ReactNative.ASSET_EXTENSIONS.filter((ext) => ext !== 'svg')
          ),
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
              scalableAssetExtensions: ReactNative.SCALABLE_ASSETS,
            },
          },
        },
      ],
    },
    plugins: [
      /**
       * Various libraries like React and React rely on `process.env.NODE_ENV` / `__DEV__`
       * to distinguish between production and development
       */
      new webpack.DefinePlugin({
        __DEV__: JSON.stringify(mode === 'development'),
      }),

      /**
       * This plugin makes sure the resolution for assets like images works with scales,
       * for example: `image@1x.png`, `image@2x.png`.
       */
      new ReactNative.AssetsResolverPlugin({
        platform,
      }),

      /**
       * React Native environment (globals and APIs that are available inside JS) differ greatly
       * from Web or Node.js. This plugin ensures everything is setup correctly so that features
       * like Hot Module Replacement will work correctly.
       */
      new ReactNative.TargetPlugin(),

      /**
       * By default Webpack will emit files into `output.path` directory (eg: `<root>/build/ios`),
       * but in order to for the React Native application to include those files (or a subset of those)
       * they need to be copied over to correct output directories supplied from React Native CLI
       * when bundling the code (with `webpack-start` command).
       * In development mode (when development server is running), this plugin is a no-op.
       */
      new ReactNative.OutputPlugin({
        platform,
        devServerEnabled: Boolean(devServer),
        localChunks: [/Async/],
        remoteChunksOutput: path.join(__dirname, 'build', platform, 'remote'),
      }),

      /**
       * Configures Hot Module Replacement and React Refresh support.
       */
      new ReactNative.DevelopmentPlugin({
        platform,
        ...devServer,
      }),

      /**
       * Configures Source Maps for the main bundle based on CLI options received from
       * React Native CLI or fallback value..
       * It's recommended to leave the default values, unless you know what you're doing.
       * Wrong options might cause symbolication of stack trace inside React Native app
       * to fail - the app will still work, but you might not get Source Map support.
       */
      new webpack.SourceMapDevToolPlugin({
        test: /\.(js)?bundle$/,
        exclude: /\.chunk\.(js)?bundle$/,
        filename: '[file].map',
        append: `//# sourceMappingURL=[url]?platform=${platform}`,
        /**
         * Uncomment for faster builds but less accurate Source Maps
         */
        // columns: false,
      }),

      /**
       * Configures Source Maps for any additional chunks.
       * It's recommended to leave the default values, unless you know what you're doing.
       * Wrong options might cause symbolication of stack trace inside React Native app
       * to fail - the app will still work, but you might not get Source Map support.
       */
      new webpack.SourceMapDevToolPlugin({
        test: /\.(js)?bundle$/,
        include: /\.chunk\.(js)?bundle$/,
        filename: '[file].map',
        append: `//# sourceMappingURL=[url]?platform=${platform}`,
        /**
         * Uncomment for faster builds but less accurate Source Maps
         */
        // columns: false,
      }),

      /**
       * Logs messages and progress.
       * It's recommended to always have this plugin, otherwise it might be difficult
       * to figure out what's going on when bundling or running development server.
       */
      new ReactNative.LoggerPlugin({
        platform,
        devServerEnabled: Boolean(devServer),
        output: {
          console: true,
          /**
           * Uncomment for having logs stored in a file to this specific compilation.
           * Compilation for each platform gets it's own log file.
           */
          // file: path.join(__dirname, '${build}.${platform}.log`),
        },
      }),
    ],
  };
};
