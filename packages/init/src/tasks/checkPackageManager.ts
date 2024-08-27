import { detect, PM } from 'detect-package-manager';
import { findRoot } from '@manypkg/find-root';
import logger from '../utils/logger.js';

/**
 * Determines which package manager to use
 *
 * @param cwd current working directory
 * @returns package manager name (one of 'npm', 'yarn', 'pnpm', 'bun')
 */
export default async function checkPackageManager(cwd: string): Promise<PM> {
  const { rootDir } = await findRoot(cwd);
  const packageManager = await detect({ cwd: rootDir });
  logger.info(`Using ${packageManager} as package manager`);

  return packageManager;
}
