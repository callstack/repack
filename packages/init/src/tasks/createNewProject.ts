import { execa } from 'execa';
import type { PackageManager } from '../types/pm.js';
import logger from '../utils/logger.js';
import spinner from '../utils/spinner.js';

export default async function createNewProject(
  projectName: string,
  packageManager: PackageManager,
  override: boolean
) {
  try {
    const args = [
      '@react-native-community/cli@latest',
      'init',
      projectName,
      '--skip-install',
    ];

    if (override) {
      args.push('--replace-directory');
    }

    spinner.message(
      'Creating new project from the React Native Community Template'
    );

    return await execa(packageManager.dlxCommand, args, {
      stdio: 'ignore',
      shell: true,
    });
  } catch {
    logger.error(
      "Failed to create a new project using '@react-native-community/cli'"
    );
  }
}
