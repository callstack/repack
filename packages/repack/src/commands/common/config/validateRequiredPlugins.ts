import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { bold } from 'colorette';
import { DEPENDENCIES_WITH_SEPARATE_PLUGINS } from '../../consts.js';

const validateRequiredPlugins = (
  rootDir: string,
  plugins: Set<string>,
  bundler: 'rspack' | 'webpack'
) => {
  const packageJson = JSON.parse(
    readFileSync(join(rootDir, 'package.json'), 'utf-8')
  );
  const dependencies = Object.keys(packageJson.dependencies);

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

      if (!plugins.has(requiredPlugin.plugin)) {
        console.warn(
          `${bold('WARNING:')} Detected ${bold(d)} package which requires ${bold(requiredPlugin.plugin)} plugin but it's not configured. ` +
            `Please add the following to your configuration file. \nRead more https://github.com/callstack/repack/tree/main/packages/${requiredPlugin.path}/README.md.`
        );
      }
    });
};

export default validateRequiredPlugins;
