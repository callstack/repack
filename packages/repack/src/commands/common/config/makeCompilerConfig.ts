import { merge } from 'webpack-merge';
import type { BundleArguments, StartArguments } from '../../types.js';
import { getCliOverrides } from './getCliOverrides.js';
import { getCommandConfig } from './getCommandConfig.js';
import { getWebpackConfigFilePath } from './getConfigFilePath.js';
import { getRspackConfigFilePath } from './getConfigFilePath.js';
import { getEnvOptions } from './getEnvOptions.js';
import { loadProjectConfig } from './loadProjectConfig.js';
import { normalizeConfig } from './normalizeConfig.js';

export async function makeCompilerConfig(
  args: StartArguments | BundleArguments,
  options: {
    bundler: 'rspack' | 'webpack';
    command: 'start' | 'bundle';
    rootDir: string;
    platforms: string[];
    reactNativePath: string;
  }
) {
  let configPath: string;
  if (options.bundler === 'rspack') {
    configPath = getRspackConfigFilePath(
      options.rootDir,
      args.config ?? args.webpackConfig
    );
  } else {
    configPath = getWebpackConfigFilePath(
      options.rootDir,
      args.config ?? args.webpackConfig
    );
  }

  // get env options for backwards compatibility with 4.X configs
  // injected as first argument to config functions
  const env = getEnvOptions(args);

  // get cli overrides which take precedence over values from config files
  const cliConfigOverrides = getCliOverrides(args);
  // get defaults for use with specific commands
  const commandConfig = getCommandConfig(options.command);

  // discover project config and load it
  const rawConfig = await loadProjectConfig(configPath);

  // normalize config to ensure it's a static config object
  const normalizedConfigs = await Promise.all(
    options.platforms.map((platform) => {
      return normalizeConfig(rawConfig, { ...env, platform });
    })
  );

  // merge in reverse order to create final configs
  const configs = normalizedConfigs.map((config) =>
    merge(commandConfig, config, cliConfigOverrides)
  );

  return configs;
}
