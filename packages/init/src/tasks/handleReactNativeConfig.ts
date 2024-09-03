import fs from 'node:fs';
import path from 'node:path';
import dedent from 'dedent';

import logger from '../utils/logger.js';

const createDefaultConfig = (bundler: 'rspack' | 'webpack') => dedent`
  module.exports = {
    commands: require('@callstack/repack/commands/${bundler}'),
  };`;

/**
 * Checks whether react-native.config.js exists and adds the commands to it
 *
 * @param cwd current working directory
 */
export default function handleReactNativeConfig(
  bundler: 'rspack' | 'webpack',
  cwd: string
): void {
  const configPath = path.join(cwd, 'react-native.config.js');

  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, createDefaultConfig(bundler));
    logger.success('Created react-native.config.js');
    return;
  }

  let configContent = fs.readFileSync(configPath, 'utf-8');
  let updatedConfigContent;

  if (!configContent.includes('commands:')) {
    updatedConfigContent = configContent.replace(
      'module.exports = {',
      `module.exports = {\n  commands: require('@callstack/repack/commands/${bundler}'),`
    );
  } else {
    const commandsIndex = configContent.indexOf('commands:');
    const commandsEndIndex = configContent.indexOf(',', commandsIndex);
    const commandsString = configContent.slice(commandsIndex, commandsEndIndex);

    const newCommandsString = `commands: require('@callstack/repack/commands/${bundler}')`;
    if (commandsString === newCommandsString) {
      logger.success('File react-native.config.js is already up to date');
      return;
    }

    logger.warn(
      "Replacing 'commands' in react-native.config.js with Re.Pack's commands"
    );

    updatedConfigContent = configContent.replace(
      commandsString,
      newCommandsString
    );
  }

  fs.writeFileSync(configPath, updatedConfigContent);
  logger.success('Updated react-native.config.js');
}
