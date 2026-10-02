import { bundle } from './bundle.js';
import { federationDoctor } from './federationDoctor.js';
import { federationInit } from './federationInit.js';
import { federationManifest } from './federationManifest.js';
import {
  bundleCommandOptions,
  federationDoctorCommandOptions,
  federationInitCommandOptions,
  federationManifestCommandOptions,
  startCommandOptions,
} from './options.js';
import { start } from './start.js';
import type {
  BundleArguments,
  Bundler,
  CliConfig,
  StartArguments,
} from './types.js';

const bundlerCommands = [
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

const federationCommands = [
  {
    // Optional positional declared in the name: RN CLI >= 17 routes plugin
    // commands through commander, which only forwards positionals that the
    // command name declares — otherwise argv[0] is the options object.
    name: 'federation-manifest [source]',
    description: 'Inspect a federation manifest from a file, directory or URL.',
    options: federationManifestCommandOptions,
    func: federationManifest,
  },
  {
    name: 'federation-doctor',
    description:
      'Check host and remote federation manifests for shared and native module drift.',
    options: federationDoctorCommandOptions,
    func: federationDoctor,
  },
  {
    // Positional declaration required for RN CLI >= 17 (see federation-manifest).
    name: 'federation-init [feature-folder]',
    description:
      'Scaffold a new federation remote from a feature folder: scanned deps, versionless defineShared configs and workspace registration, all diffed before any write.',
    options: federationInitCommandOptions,
    func: federationInit,
  },
] as const;

const commands = [...bundlerCommands, ...federationCommands];

export default commands;

/**
 * Creates command definitions with a forced bundler engine.
 * Used by deprecated entry points (`commands/rspack`, `commands/webpack`)
 * to maintain backwards compatibility. Bundler-independent commands
 * (`federation-*`) are not exposed through those entry points.
 */
export function createBoundCommands(bundler: Bundler) {
  return bundlerCommands.map((cmd) => ({
    ...cmd,
    func: (
      _: string[],
      cliConfig: CliConfig,
      args: BundleArguments & StartArguments
    ) => {
      if (args.bundler && args.bundler !== bundler) {
        console.warn(
          `Ignoring "--bundler ${args.bundler}" because the deprecated "@callstack/repack/commands/${bundler}" entry point explicitly selects ${bundler}. Use "@callstack/repack/commands" to select a bundler with --bundler.`
        );
      }

      return cmd.func(_, cliConfig, args, bundler);
    },
  }));
}
