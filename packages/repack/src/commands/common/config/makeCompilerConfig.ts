import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { bold } from 'colorette';
import { merge } from 'webpack-merge';
import { DEPENDENCIES_WITH_SEPARATE_PLUGINS } from '../../consts.js';
import type {
  BundleArguments,
  ConfigurationObject,
  StartArguments,
} from '../../types.js';
import { getCliOverrides } from './getCliOverrides.js';
import { getCommandConfig } from './getCommandConfig.js';
import { getConfigFilePath } from './getConfigFilePath.js';
import { getEnvOptions } from './getEnvOptions.js';
import { getRepackConfig } from './getRepackConfig.js';
import { loadProjectConfig } from './loadProjectConfig.js';
import { normalizeConfig } from './normalizeConfig.js';

interface MakeCompilerConfigOptions {
  args: StartArguments | BundleArguments;
  bundler: 'rspack' | 'webpack';
  command: 'start' | 'bundle';
  rootDir: string;
  platforms: string[];
  reactNativePath: string;
}

export async function makeCompilerConfig<C extends ConfigurationObject>(
  options: MakeCompilerConfigOptions
): Promise<C[]> {
  const { args, bundler, command, rootDir, reactNativePath } = options;
  // discover location of project config
  const configPath = getConfigFilePath(
    bundler,
    rootDir,
    args.config ?? args.webpackConfig
  );

  // get env options for backwards compatibility with 4.X configs
  // injected as first argument to config functions
  const env = getEnvOptions({ args, command, rootDir, reactNativePath });

  // get cli overrides which take precedence over values from config files
  const cliConfigOverrides = getCliOverrides<C>({ args, command });
  // get defaults for use with specific commands
  const commandConfig = getCommandConfig(command);

  // get defaults that will be applied on top of built-in ones (Rspack/webpack)
  const repackConfig = getRepackConfig();

  // load the project config
  const rawConfig = await loadProjectConfig<C>(configPath);

  // inject env and create platform-specific configs
  const projectConfigs: C[] = await Promise.all(
    options.platforms.map((platform) => {
      // eval the config and inject the platform
      if (typeof rawConfig === 'function') {
        return rawConfig({ ...env, platform }, {});
      }
      // shallow copy to avoid mutating the original config
      return { ...rawConfig };
    })
  );

  // merge in reverse order to create final configs
  const configs = projectConfigs.map((config) =>
    merge([repackConfig, commandConfig, config, cliConfigOverrides])
  );

  // normalize the configs
  const normalizedConfigs = configs.map((config, index) =>
    normalizeConfig(config, options.platforms[index])
  );

  const packageJson = JSON.parse(
    readFileSync(join(rootDir, 'package.json'), 'utf-8')
  );

  const dependencies = Object.keys(packageJson.dependencies);
  const activePlugins = new Set(
    normalizedConfigs
      .flatMap((c) => ('plugins' in c ? c.plugins : []))
      .map((p) => p?.constructor.name)
  );

  dependencies
    .filter((d) => DEPENDENCIES_WITH_SEPARATE_PLUGINS[d])
    .forEach((d) => {
      const requiredPlugin = DEPENDENCIES_WITH_SEPARATE_PLUGINS[d];

      if (!activePlugins.has(requiredPlugin.plugin)) {
        console.warn(
          `${bold('WARNING:')} Detected ${bold(d)} package which requires ${bold(requiredPlugin.plugin)} plugin but it's not configured. ` +
            `Please add the following to your configuration file. \nRead more https://github.com/callstack/repack/tree/main/packages/${requiredPlugin.path}/README.md.`
        );
      }
    });

  return normalizedConfigs as C[];
}
