import { bundleCommandOptions, startCommandOptions } from '../options.js';
import { bundle } from './bundle.js';
import { start } from './start.js';

const commands = [
  {
    name: 'bundle',
    description: 'Build the bundle for the provided JavaScript entry file.',
    options: bundleCommandOptions,
    func: bundle,
  },
  {
    name: 'webpack-bundle',
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
  {
    name: 'webpack-start',
    description: 'Start the React Native development server.',
    options: startCommandOptions,
    func: start,
  },
] as const;

export default commands;
