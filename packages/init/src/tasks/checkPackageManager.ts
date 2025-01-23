import { type PM, detect } from 'detect-package-manager';
import type { PackageManager } from '../types/pm.js';
import logger from '../utils/logger.js';

const PM_MAPPING: Record<string, PM> = {
  npm: 'npm',
  npx: 'npm',
  yarn: 'yarn',
  yarnpkg: 'yarn',
  pnpm: 'pnpm',
  pnpx: 'pnpm',
  bun: 'bun',
  bunx: 'bun',
};

const PM_COMMANDS: Record<PM, PackageManager> = {
  npm: { name: 'npm', runCommand: 'npm', dlxCommand: 'npx' },
  yarn: { name: 'yarn', runCommand: 'yarn', dlxCommand: 'yarn dlx' },
  pnpm: { name: 'pnpm', runCommand: 'pnpm', dlxCommand: 'pnpm dlx' },
  bun: { name: 'bun', runCommand: 'bun', dlxCommand: 'bunx' },
};

/**
 * Determines which package manager to use
 *
 * @param projectRootDir root directory of the project
 * @returns package manager details including name and commands
 */
export default async function checkPackageManager(
  rootDir: string | undefined
): Promise<PackageManager> {
  let packageManager: PM;

  if (rootDir) {
    packageManager = await detect({ cwd: rootDir });
    logger.info(`Detected ${packageManager} as package manager`);
  } else {
    const candidate = process.argv0;
    packageManager = PM_MAPPING[candidate];
    if (packageManager) {
      logger.info(
        `Detected ${packageManager} as package manager from executor ${candidate}`
      );
    } else {
      logger.info('No package manager detected, defaulting to npm');
      packageManager = 'npm';
    }
  }

  return PM_COMMANDS[packageManager];
}
