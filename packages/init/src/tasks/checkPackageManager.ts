import { findUpSync } from 'find-up';

import logger from '../utils/logger.js';

function isProjectUsingYarn(cwd: string) {
  return findUpSync('yarn.lock', { cwd });
}

/**
 * Determines which package manager to use
 *
 * @param cwd current working directory
 * @returns package manager name
 */
export default function checkPackageManager(cwd: string) {
  const yarnLockPath = isProjectUsingYarn(cwd);

  if (yarnLockPath) {
    logger.info('Using yarn as package manager');
    return 'yarn';
  }
  logger.info('Using npm as package manager');
  return 'npm';
}
