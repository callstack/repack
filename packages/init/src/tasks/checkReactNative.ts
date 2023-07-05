import fs from 'fs';
import path from 'path';
import semver from 'semver';

import logger from '../utils/logger.js';

/**
 * Checks whether react-native is installed and returns it's version
 *
 * @param cwd
 * @returns React-Native version
 */
export default function checkReactNative(rootDir: string): string {
  const packageJsonPath = path.join(rootDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  if (!packageJson?.dependencies['react-native']) {
    logger.error('React-Native not found in package.json');
    throw new Error('React-Native not found in package.json');
  }

  const version = packageJson.dependencies['react-native'];

  logger.info(`Found React-Native@${version} in package.json`);

  if (semver.minor(version) < 69) {
    logger.warn('Re.Pack officially supports React-Native >= 0.69.0');
    logger.warn(
      'You can still use Re.Pack with older versions of React-Native, but you might encounter some issues.'
    );
  }

  return version;
}
