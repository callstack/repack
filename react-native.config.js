const RnCliStartCommand = require('@react-native-community/cli/build/commands/start/start')
  .default;

module.exports = {
  commands: [
    {
      name: 'webpack-bundle',
      options: require('@react-native-community/cli/build/commands/bundle/bundleCommandLineArgs')
        .default,
      func: require('./dist/commands/bundle').bundle,
    },
    {
      name: 'webpack-start',
      options: RnCliStartCommand.options,
      description: RnCliStartCommand.description,
      func: require('./dist/commands/start').start,
    },
  ],
};
