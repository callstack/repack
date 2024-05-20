import { detect, PM } from 'detect-package-manager';
import logger from '../utils/logger.js';

/**
 * Determines which package manager to use
 *
 * @param cwd current working directory
 * @returns package manager name (one of 'npm', 'yarn', 'pnpm', 'bun')
 */
export default async function checkPackageManager(
  rootDir: string
): Promise<PM> {
  const packageManager = await detect({ cwd: rootDir });
  logger.info(`Using ${packageManager} as package manager`);

  return packageManager;
}
