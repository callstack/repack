const webpack = require('webpack');
const {
  parseCliOptions,
  getInitializationEntries,
  getResolveOptions,
  ReactNativeAssetsPlugin,
  LoggerPlugin,
  DevServerPlugin,
  DEFAULT_PORT,
  ReactNativeTargetPlugin,
} = require('react-native-webpack-toolkit');

/**
 * More documentation, installation, usage, motivation and differences with Metro is available at:
 * https://github.com/callstack/react-native-webpack-toolkit/blob/main/README.md
 *
 * The API documentation for the functions and plugins used in this file is available at:
 * https://callstack.github.io/react-native-webpack-toolkit/
 */

/**
 * This is the Webpack configuration file for your React Native project.
 * It can be used in 2 ways:
 * - by running React Native CLI eg: `npx react-native start` or `npx react-native bundle`
 * - by running Webpack CLI eg: `npx webpack-cli -c webpack.config.js`
 *
 * Depending on which option you chose the output might be different, since when running with
 * React Native CLI most of the values from `parseCliOptions` will be filled in by React Native CLI.
 * However, when running with Webpack CLI, you might want to tweak `fallback` values to your liking.
 *
 * Please refer to the API documentation for list of options, plugins and their descriptions.
 */

/**
 * Get options from React Native CLI when Webpack is run from `react-native start` or `react-native bundle`
 *
 * If you run Webpack using Webpack CLI the default and fallback values will be used - use `fallback`
 * to specify your values if the default's doesn't suit your project.
 */
const {
  dev,
  mode,
  context,
  entry,
  platform,
  reactNativePath,
  outputPath,
  outputFilename,
  assetsOutputPath,
  devServer,
  sourcemapFilename,
} = parseCliOptions({
  fallback: {
    /**
     * Fallback to production when running with Webpack CLI.
     */
    mode: 'production',
    /**
     * Make sure you always specify platform when running with Webpack CLI.
     * Alternatively you could use `process.env.PLATFORM` and run:
     * `PLATFORM=ios npx webpack-cli -c webpack.config.js`
     */
    platform: 'ios',
    devServer: { port: DEFAULT_PORT },
  },
});

/**
 * Enable Hot Module Replacement with React Refresh in development.
 */
const hmr = dev;

/**
 * Enable development server in development mode.
 */
const devServerEnabled = dev;

/**
 * Depending on your Babel configuration you might want to keep it.
 * If you don't use `env` in your Babel config, you can remove it.
 *
 * Keep in mind that if you remove it you should set `BABEL_ENV` or `NODE_ENV`
 * to `development` or `production`. Otherwise your production code might be compiled with
 * in development mode by Babel.
 */
process.env.BABEL_ENV = mode;

/**
 * Webpack configuration.
 */
module.exports = {
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
  entry: [...getInitializationEntries(reactNativePath, { hmr }), entry],
  resolve: {
    /**
     * `getResolveOptions` returns additional resolution configuration for React Native.
     * If it's removed, you won't be able to use `<file>.<platform>.<ext>` (eg: `file.ios.js`)
     * convention and some 3rd-party libraries that specify `react-native` field
     * in their `package.json` might not work correctly.
     */
    ...getResolveOptions(platform),

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
   * Configure output.
   * Unless you don't want to use output values passed from React Native CLI, it's recommended to
   * leave it as it is.
   */
  output: {
    path: outputPath,
    filename: outputFilename,
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
            plugins: hmr ? ['module:react-refresh/babel'] : undefined,
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
      'process.env': {
        NODE_ENV: JSON.stringify(mode),
      },
      __DEV__: JSON.stringify(dev),
    }),

    /**
     * This plugin will make sure you can use assets like images, videos, audio.
     */
    new ReactNativeAssetsPlugin({
      platform,
      context,
      outputPath,
      assetsOutputPath,
      bundleToFile: !devServer,
    }),

    /**
     * React Native environment (globals and APIs that are available inside JS) differ greatly
     * from Web or Node.js. This plugin will ensure everything is setup correctly so that features
     * like Hot Module Replacement will work correctly.
     */
    new ReactNativeTargetPlugin(),

    /**
     * Runs development server when running with React Native CLI start command or if `devServer`
     * was provided as s `fallback`.
     */
    new DevServerPlugin({
      enabled: devServerEnabled,
      hmr,
      context,
      platform,
      ...devServer,
    }),

    /**
     * Configures Source Maps.
     * It's recommended to leave the default values, unless you know what you're doing.
     * Wrong options might cause symbolication of stack trace inside React Native app
     * to fail - the app will still work, but you might not get Source Map support.
     */
    new webpack.SourceMapDevToolPlugin({
      test: /\.([jt]sx?|(js)?bundle)$/,
      filename: dev ? '[file].map' : sourcemapFilename,
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
    new LoggerPlugin({
      platform,
      devServerEnabled,
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
