import fs from 'node:fs';
import path from 'node:path';
import logger from '../utils/logger.js';

/**
 * Checks whether React Native project exists at a given directory
 *
 * @param projectRootDir root directory of the project
 * @returns true if React Native project is found, false otherwise
 */
export default function checkProjectExists(projectRootDir: string): boolean {
  try {
    const packageJsonPath = path.join(projectRootDir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    if (!packageJson?.dependencies['react-native']) {
      logger.info(
        `React Native is not installed in the project at ${projectRootDir}`
      );
      return false;
    }
  } catch {
    logger.info(`No React Native project found at ${projectRootDir}`);
    return false;
  }

  logger.info(`React Native project found at ${projectRootDir}`);
  return true;
}
