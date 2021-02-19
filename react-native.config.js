module.exports = {
  commands: [
    {
      name: 'webpack-bundle',
      options: require('@react-native-community/cli/build/commands/bundle/bundleCommandLineArgs')
        .default,
      func: require('./dist/commands/bundle').bundle,
    },
  ],
};
