const path = require('path');
const { createRequire } = require('module');

function getReactNativeCliPath() {
  let cliPath;

  try {
    cliPath = path.dirname(require.resolve('@react-native-community/cli'));
  } catch {
    // NOOP
  }

  try {
    cliPath = path.dirname(
      require.resolve('react-native/node_modules/@react-native-community/cli')
    );
  } catch {
    // NOOP
  }

  try {
    const rnRequire = createRequire(require.resolve('react-native'));
    cliPath = path.dirname(rnRequire.resolve('@react-native-community/cli'));
  } catch {
    // NOOP
  }

  if (!cliPath) {
    throw new Error('Cannot resolve @react-native-community/cli package');
  }

  return cliPath;
}

const {
  projectCommands: cliCommands,
} = require(`${getReactNativeCliPath()}/commands`);

const startCommand = cliCommands.find((command) => command.name === 'start');
const bundleCommand = cliCommands.find((command) => command.name === 'bundle');

const webpackConfigOption = {
  name: '--webpackConfig <path>',
  description: 'Path to a Webpack config',
  parse: (val) => path.resolve(val),
  default: (config) => {
    const {
      getWebpackConfigPath,
    } = require('./dist/commands/utils/getWebpackConfigPath');

    try {
      return getWebpackConfigPath(config.root);
    } catch {
      return '';
    }
  },
};

module.exports = [
  {
    name: 'webpack-bundle',
    description: bundleCommand.description,
    options: bundleCommand.options.concat(
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
    options: startCommand.options.concat(
      {
        name: '--verbose',
        description: 'Enables verbose logging',
      },
      {
        name: '--silent',
        description: 'Silents all logs to the console/stdout',
      },
      {
        name: '--log-file <string>',
        description: 'Enables file logging to specified file',
      },
      webpackConfigOption
    ),
    description: startCommand.description,
    func: require('./dist/commands/start').start,
  },
];
