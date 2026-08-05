import { bundle } from './bundle.js';
import { bundleCommandOptions, startCommandOptions } from './options.js';
import { start } from './start.js';
import type {
  BundleArguments,
  Bundler,
  CliConfig,
  StartArguments,
} from './types.js';

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

/**
 * Creates command definitions with a forced bundler engine.
 * Used by deprecated entry points (`commands/rspack`, `commands/webpack`)
 * to maintain backwards compatibility.
 */
export function createBoundCommands(bundler: Bundler) {
  return commands.map((cmd) => ({
    ...cmd,
    func: (
      _: string[],
      cliConfig: CliConfig,
      args: BundleArguments & StartArguments
    ) => cmd.func(_, cliConfig, args, bundler),
  }));
}
