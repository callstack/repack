import { bundleCommandOptions, startCommandOptions } from '../options';
import { bundle } from './bundle';
import { start } from './start';

const commands = [
  {
    name: 'bundle',
    description: 'Build the bundle for the provided JavaScript entry file.',
    options: bundleCommandOptions,
    func: bundle,
  },
  {
    name: 'start',
    description: 'Start the React Native development server.',
    options: startCommandOptions,
    func: start,
  },
];

const webpackCommands = commands.map((command) => ({
  name: `webpack-${command.name}`,
  description: command.description,
  options: command.options,
  func: command.func,
}));

export default [...commands, ...webpackCommands];
module.exports = [...commands, ...webpackCommands];
