const { parseCliOptions, getInitializationEntries, getResolveOptions, ReactNativeAssetsPlugin, LoggerPlugin } = require('../..');
const webpack = require('webpack');
const path = require('path')

const { dev, mode, context, entry, platform, reactNativePath, outputPath, outputFilename, assetsOutputPath } = parseCliOptions({
  fallback: {
    mode: 'development',
    dev: true,
    entry: './index.js',
    outputPath: path.join(__dirname, 'dist'),
    assetsOutputPath: path.join(__dirname, 'dist'),
    outputFilename: 'main.js',
    platform: 'ios',
    context: __dirname,
    reactNativePath: path.join(__dirname, './node_modules/react-native'),
    minimize: false,
  }
});

module.exports = {
  mode,
  context,
  entry: [
    ...getInitializationEntries(reactNativePath),
    entry,
  ],
  resolve: {
    ...getResolveOptions(platform)
  },
  output: {
    path: outputPath,
    filename: outputFilename,
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules(?!.*[\/\\](react|@react-navigation|@react-native-community|@expo|pretty-format|metro))/,
        use: 'babel-loader'
      }
    ]
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
      assetsOutputPath
    }),
    new LoggerPlugin({
      output: {
        console: true,
        file: 'build.log'
      }
    })
  ]
};

