const path = require('path');
const { createRequire } = require('module');

function getCommands() {
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

  const { projectCommands } = require(`${cliPath}/commands`);
  const commandNames = Object.values(projectCommands).map(({ name }) => name);

  if (commandNames.includes('bundle') && commandNames.includes('start')) {
    return projectCommands;
  }

  // RN >= 0.73
  let commands;

  try {
    commands = require(
      require.resolve('react-native/react-native.config.js')
    ).commands;
  } catch (e) {
    // NOOP
  }

  if (!commands) {
    throw new Error('Cannot resolve path to react-native package');
  }

  return commands;
}

const cliCommands = Object.values(getCommands());

const startCommand = cliCommands.find(({ name }) => name === 'start');
const bundleCommand = cliCommands.find(({ name }) => name === 'bundle');

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

const commands = [
  {
    name: 'bundle',
    description: bundleCommand.description,
    options: bundleCommand.options.concat(
      {
        name: '--verbose',
        description: 'Enables verbose logging',
      },
      webpackConfigOption,
      {
        name: '--json <statsFile>',
        description: 'Stores stats in a file.',
        parse: (val) => path.resolve(val),
      },
      {
        name: '--stats <preset>',
        description:
          'It instructs Webpack on how to treat the stats e.g. normal',
      }
    ),
    func: require('./dist/commands/bundle').bundle,
  },
  {
    name: 'start',
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
        name: '--json',
        description: 'Log all messages to the console/stdout in JSON format',
      },
      {
        name: '--reverse-port',
        description: 'ADB reverse port on starting devServers only for Android',
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

const webpackCommands = commands.map((command) => ({
  ...command,
  name: `webpack-${command.name}`,
}));

module.exports = [...commands, ...webpackCommands];
