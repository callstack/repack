import preferredPM from 'preferred-pm';
import whichPmRuns from 'which-pm-runs';
import type { PM, PackageManager } from '../types/pm.js';
import logger from '../utils/logger.js';

const PM_COMMANDS: Record<PM, PackageManager> = {
  npm: { name: 'npm', runCommand: 'npm', dlxCommand: 'npx' },
  yarn: { name: 'yarn', runCommand: 'yarn', dlxCommand: 'yarn dlx' },
  pnpm: { name: 'pnpm', runCommand: 'pnpm', dlxCommand: 'pnpm dlx' },
  bun: { name: 'bun', runCommand: 'bun', dlxCommand: 'bunx' },
};

/**
 * Determines which package manager to use
 *
 * @param rootDir root directory of the project
 * @returns package manager details including name and commands
 */
export default async function checkPackageManager(
  rootDir: string | undefined
): Promise<PackageManager> {
  let packageManager: PM;

  // check for package manager in the project
  if (rootDir) {
    const result = await preferredPM(rootDir);
    if (result) {
      packageManager = result.name;
      logger.info(
        `Detected ${packageManager} as package manager in the project.`
      );
      return PM_COMMANDS[packageManager];
    }
  }

  // fallback to the one that runs the script
  const result = whichPmRuns();
  if (result) {
    packageManager = result.name as PM;
    logger.info(
      `Detected ${packageManager} as package manager running the script`
    );
    return PM_COMMANDS[packageManager];
  }

  // fallback to npm as a last resort
  logger.info('No package manager detected, defaulting to npm');
  packageManager = 'npm';

  return PM_COMMANDS[packageManager];
}
