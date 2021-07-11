const path = require('path');
const RnCliStartCommand =
  require('@react-native-community/cli/build/commands/start/start').default;

const webpackConfigOption = {
  name: '--webpackConfig <path>',
  description: 'Path to a Webpack config',
  parse: (val) => path.resolve(val),
};

module.exports = [
  {
    name: 'webpack-bundle',
    options:
      require('@react-native-community/cli/build/commands/bundle/bundleCommandLineArgs').default.concat(
        {
          name: '--verbose',
          description: 'Enables verbose logging',
        },
        webpackConfigOption
      ),
    func: require('./dist/commands/bundle').bundle,
  },
  {
    name: 'webpack-start',
    options: RnCliStartCommand.options.concat(webpackConfigOption),
    description: RnCliStartCommand.description,
    func: require('./dist/commands/start').start,
  },
];
