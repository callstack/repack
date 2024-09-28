import { bundleCommandOptions, startCommandOptions } from '../options';
import { bundle } from './bundle';
import { start } from './start';

type BundleCommand = typeof bundle;
type BundleOptions = typeof bundleCommandOptions;

type StartCommand = typeof start;
type StartOptions = typeof startCommandOptions;

const commands = [
  {
    name: 'bundle',
    description: 'Build the bundle for the provided JavaScript entry file.',
    options: bundleCommandOptions as BundleOptions,
    func: bundle as BundleCommand,
  },
  {
    name: 'webpack-bundle',
    description: 'Build the bundle for the provided JavaScript entry file.',
    options: bundleCommandOptions as BundleOptions,
    func: bundle as BundleCommand,
  },
  {
    name: 'start',
    description: 'Start the React Native development server.',
    options: startCommandOptions as StartOptions,
    func: start as StartCommand,
  },
  {
    name: 'webpack-start',
    description: 'Start the React Native development server.',
    options: startCommandOptions as StartOptions,
    func: start as StartCommand,
  },
] as const;

export default commands;
module.exports = commands;
