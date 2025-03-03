import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { bold } from 'colorette';
import { CLIError } from '@react-native-community/cli-tools';
import { ConfigurationObject } from '../../types.js';

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


const validatePluginConfiguration = <C extends ConfigurationObject>(
  rootDir: string,
  configs: C[],
  bundler: 'rspack' | 'webpack'
) => {
  let dependencies: string[] = [];

  const activePlugins = new Set(
    configs
      .flatMap((c) => ('plugins' in c ? c.plugins : []))
      .map((p) => p?.constructor.name)
      .filter((p): p is string => p !== undefined)
  );

  try {
    const packageJson = JSON.parse(
      readFileSync(join(rootDir, 'package.json'), 'utf-8')
    );
    dependencies = Object.keys(packageJson.dependencies || {});
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new CLIError(
        'Could not find package.json in your project root. ' +
        'Make sure you are running this command from your React Native project root directory.'
      );
    }
    throw new CLIError(
      'Failed to parse package.json: ' + 
      (error instanceof Error ? error.message : 'Unknown error')
    );
  }

  dependencies
    .filter((d) => {
      const plugin = DEPENDENCIES_WITH_SEPARATE_PLUGINS[d];

      if (!plugin) {
        return false;
      }

      return plugin.bundler ? plugin.bundler === bundler : true;
    })
    .forEach((d) => {
      const requiredPlugin = DEPENDENCIES_WITH_SEPARATE_PLUGINS[d];

      if (!activePlugins.has(requiredPlugin.plugin)) {
        console.warn(
          `${bold('WARNING:')} Detected ${bold(d)} package which requires ${bold(requiredPlugin.plugin)} plugin but it's not configured. ` +
            `Please add the following to your configuration file. \nRead more https://github.com/callstack/repack/tree/main/packages/${requiredPlugin.path}/README.md.`
        );
      }
    });
};

export default validatePluginConfiguration;
