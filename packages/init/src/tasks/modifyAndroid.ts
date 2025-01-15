import fs from 'node:fs';
import path from 'node:path';
import dedent from 'dedent';

import logger from '../utils/logger.js';

const defaultNewConfig = dedent`
  react {
      bundleCommand = "webpack-bundle"
  }`;

function modifyNewConfig(config: string): string {
  logger.info('Modifying android/app/build.gradle');

  const androidConfig = 'android {';
  const reactConfigIndex = config.indexOf('react {');

  if (reactConfigIndex === -1) {
    // Add the default react config if it doesn't exist
    return config.replace(
      androidConfig,
      defaultNewConfig + '\n\n' + androidConfig
    );
  }

  const bundleCommandRegex = /\/\/\sbundleCommand\s*=\s*".*?"/;
  if (bundleCommandRegex.test(config)) {
    // Replace the commented out bundleCommand
    return config.replace(
      bundleCommandRegex,
      'bundleCommand = "webpack-bundle"'
    );
  }

  const existingBundleCommandRegex = /bundleCommand\s*=\s*".*?"/;
  if (existingBundleCommandRegex.test(config)) {
    // Replace existing bundleCommand
    return config.replace(
      existingBundleCommandRegex,
      'bundleCommand = "webpack-bundle"'
    );
  }

  // Otherwise, add the bundleCommand to the existing config
  return config.replace(
    'react {',
    'react {\n    bundleCommand: "webpack-bundle"'
  );
}

/**
 * Modifies the android part of the project to support Re.Pack
 *
 * @param cwd path for the root directory of the project
 * @param reactNativeVersion version of react-native in project
 */
export default function modifyAndroid(cwd: string) {
  const buildGradlePath = path.join(cwd, 'android', 'app', 'build.gradle');
  const config = fs.readFileSync(buildGradlePath, 'utf-8');

  if (!fs.existsSync(buildGradlePath)) {
    throw Error(
      'File android/app/build.gradle not found. Make sure you are running this command from the root of your project'
    );
  }

  logger.info('Found android/app/build.gradle');

  const updatedConfig = modifyNewConfig(config);

  fs.writeFileSync(buildGradlePath, updatedConfig);
  logger.success(
    'Added "webpack-bundle" as bundleCommand to android/app/build.gradle'
  );
}
