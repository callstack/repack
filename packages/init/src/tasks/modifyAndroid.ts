import fs from 'fs';
import path from 'path';
import semver from 'semver';
import dedent from 'dedent';

import logger from '../utils/logger.js';

const defaultOldConfig = dedent`
  project.ext.react = [
      bundleCommand: "webpack-bundle",
  ]`;

const defaultNewConfig = dedent`
  react {
      bundleCommand = "webpack-bundle"
  }`;

function modifyOldConfig(config: string): string {
  logger.info('Modifying android/app/build.gradle for React-Native < 0.71.0');

  // Make sure we capture actual config and not the commented out one
  const applyReactGradleRegex =
    /(?<!`)apply from: "\.\.\/\.\.\/node_modules\/react-native\/react\.gradle"/;
  const projectExtReactRegex = /(?<!\*\s)project\.ext\.react\s*=\s*\[/;
  const reactConfigIndex = config.search(projectExtReactRegex);

  if (reactConfigIndex === -1) {
    // Add the default react config if it doesn't exist
    return config.replace(
      applyReactGradleRegex,
      defaultOldConfig +
        '\n\n' +
        'apply from: "../../node_modules/react-native/react.gradle"'
    );
  }

  const bundleCommandRegex = /(?<!\*\s{3})bundleCommand\s*:\s*".*?"/;
  if (bundleCommandRegex.test(config)) {
    // Replace the bundleCommand if it exists
    return config.replace(
      bundleCommandRegex,
      'bundleCommand: "webpack-bundle"'
    );
  }

  // Otherwise, add the bundleCommand to the existing config
  return config.replace(
    projectExtReactRegex,
    'project.ext.react = [\n    bundleCommand: "webpack-bundle",'
  );
}

function modifyNewConfig(config: string): string {
  logger.info('Modifying android/app/build.gradle for React-Native >= 0.71.0');

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
export default function modifyAndroid(cwd: string, reactNativeVersion: string) {
  const buildGradlePath = path.join(cwd, 'android', 'app', 'build.gradle');
  const config = fs.readFileSync(buildGradlePath, 'utf-8');

  if (!fs.existsSync(buildGradlePath)) {
    throw Error(
      'File android/app/build.gradle not found. Make sure you are running this command from the root of your project'
    );
  }

  logger.info('Found android/app/build.gradle');

  let updatedConfig: string;
  if (semver.minor(reactNativeVersion) >= 71) {
    updatedConfig = modifyNewConfig(config);
  } else {
    updatedConfig = modifyOldConfig(config);
  }

  fs.writeFileSync(buildGradlePath, updatedConfig);
  logger.success(
    'Added "webpack-bundle" as bundleCommand to android/app/build.gradle'
  );
}
