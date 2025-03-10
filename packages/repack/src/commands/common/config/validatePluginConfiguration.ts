import path from 'node:path';
import { bold } from 'colorette';
import type { ConfigurationObject } from '../../types.js';
import { CLIError } from '../error.js';

const DEPENDENCIES_WITH_SEPARATE_PLUGINS: Record<
  string,
  { plugin: string; path: string; bundler?: 'rspack' | 'webpack' }
> = {
  'react-native-reanimated': {
    plugin: 'ReanimatedPlugin',
    path: 'plugin-reanimated',
    bundler: 'rspack',
  },
  nativewind: {
    plugin: 'NativeWindPlugin',
    path: 'plugin-nativewind',
  },
  expo: {
    plugin: 'ExpoModulesPlugin',
    path: 'plugin-expo-modules',
  },
} as const;

async function validatePluginConfiguration<C extends ConfigurationObject>(
  rootDir: string,
  configs: C[],
  bundler: 'rspack' | 'webpack'
) {
  let dependencies: string[] = [];

  const activePlugins = new Set(
    configs
      .flatMap((config) => ('plugins' in config ? config.plugins : []))
      .map((plugin) => plugin?.constructor.name)
      .filter((pluginName): pluginName is string => pluginName !== undefined)
  );

  try {
    const packageJson = require(path.join(rootDir, 'package.json'));
    dependencies = Object.keys(packageJson.dependencies || {});
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new CLIError(
        `Could not find package.json in your project root: ${rootDir}. `
      );
    }
    throw new CLIError(
      'Failed to parse package.json: ' +
        (error instanceof Error ? error.message : 'Unknown error')
    );
  }

  dependencies
    .filter((dependency) => {
      const plugin = DEPENDENCIES_WITH_SEPARATE_PLUGINS[dependency];

      if (!plugin) {
        return false;
      }

      return plugin.bundler ? plugin.bundler === bundler : true;
    })
    .forEach((dependency) => {
      const requiredPlugin = DEPENDENCIES_WITH_SEPARATE_PLUGINS[dependency];

      if (!activePlugins.has(requiredPlugin.plugin)) {
        console.warn(
          `${bold('WARNING:')} Detected ${bold(dependency)} package which requires ${bold(requiredPlugin.plugin)} plugin but it's not configured. ` +
            `Please add the following to your configuration file. \nRead more https://github.com/callstack/repack/tree/main/packages/${requiredPlugin.path}/README.md.`
        );
      }
    });
}

export { validatePluginConfiguration };
