const path = require('path');
const webpack = require('webpack');
const {
  parseCliOptions,
  getInitializationEntries,
  getResolveOptions,
  ReactNativeAssetsPlugin,
  LoggerPlugin,
  DevServerPlugin,
  DEFAULT_PORT,
} = require('../..');

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
    platform: 'ios',
    devServer: { port: DEFAULT_PORT },
  },
});

module.exports = {
  mode,
  devtool: false,
  context,
  entry: [...getInitializationEntries(reactNativePath), entry],
  resolve: {
    ...getResolveOptions(platform),
  },
  output: {
    path: outputPath,
    filename: outputFilename,
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules(?!.*[/\\](react|@react-navigation|@react-native-community|@expo|pretty-format|metro))/,
        use: 'babel-loader',
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      /**
       * Various libraries like React rely on `process.env.NODE_ENV`
       * to distinguish between production and development
       */
      'process.env': {
        NODE_ENV: JSON.stringify(mode),
      },
      __DEV__: JSON.stringify(dev),
    }),
    new ReactNativeAssetsPlugin({
      platform,
      context,
      outputPath,
      assetsOutputPath,
      bundleToFile: !devServer,
    }),
    new LoggerPlugin({
      output: {
        console: true,
        file: path.join(__dirname, 'build.log'),
      },
    }),
    new DevServerPlugin(devServer),
    new webpack.SourceMapDevToolPlugin({
      test: /\.([jt]sx?|(js)?bundle)$/,
      filename: sourcemapFilename,
      noSources: dev,
      // Uncomment for faster builds but less accurate source maps
      // columns: false,
    }),
  ],
};
