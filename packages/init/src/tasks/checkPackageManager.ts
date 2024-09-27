import { type PM, detect } from 'detect-package-manager';
import logger from '../utils/logger.js';

/**
 * Determines which package manager to use
 *
 * @param rootDir root directory of the project
 * @returns package manager name (one of 'npm', 'yarn', 'pnpm', 'bun')
 */
export default async function checkPackageManager(
  rootDir: string
): Promise<PM> {
  const packageManager = await detect({ cwd: rootDir });
  logger.info(`Using ${packageManager} as package manager`);

  return packageManager;
}
