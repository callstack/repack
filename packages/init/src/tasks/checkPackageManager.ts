import { type PM, detect } from 'detect-package-manager';
import logger from '../utils/logger.js';

const PACKAGE_MANAGERS = ['npm', 'yarn', 'pnpm', 'bun'];

interface ProjectOptions {
  projectRootDir: string | undefined;
}

/**
 * Determines which package manager to use
 *
 * @param projectRootDir root directory of the project
 * @returns package manager name (one of 'npm', 'yarn', 'pnpm', 'bun')
 */
export default async function checkPackageManager({
  projectRootDir,
}: ProjectOptions): Promise<PM> {
  if (projectRootDir) {
    const packageManager = await detect({ cwd: projectRootDir });
    logger.info(`Detected ${packageManager} as package manager`);
    return packageManager;
  }

  const candidate = process.argv0;
  if (PACKAGE_MANAGERS.includes(candidate)) {
    logger.info(`Detected ${candidate} as package manager`);
    return candidate as PM;
  }

  logger.info('No package manager detected, defaulting to npm');
  return 'npm';
}
