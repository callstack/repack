const commands = [
  {
    name: 'bundle',
    description: 'Build the bundle for the provided JavaScript entry file.',
    options: require('./dist/commands/options').bundleCommandOptions,
    func: require('./dist/commands/webpack').bundle,
  },
  {
    name: 'start',
    description: 'Start the React Native development server.',
    options: require('./dist/commands/options').startCommandOptions,
    func: require('./dist/commands/webpack').start,
  },
];

const webpackCommands = commands.map((command) => ({
  ...command,
  name: `webpack-${command.name}`,
}));

module.exports = [...commands, ...webpackCommands];
