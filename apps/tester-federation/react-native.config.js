const { configureProjects } = require('react-native-test-app');

const useWebpack = Boolean(process.env.USE_WEBPACK);

module.exports = {
  project: configureProjects({
    android: {
      sourceDir: 'android',
    },
    ios: {
      sourceDir: 'ios',
    },
  }),
  commands: useWebpack
    ? require('@callstack/repack/commands/webpack')
    : require('@callstack/repack/commands/rspack'),
};
