import path from 'node:path';
import { execa } from 'execa';
import type { PackageManager } from '../types/pm.js';
import { RepackInitError } from '../utils/error.js';
import spinner from '../utils/spinner.js';

export default async function createNewProject(
  cwd: string,
  projectName: string,
  packageManager: PackageManager,
  override: boolean
) {
  try {
    const args = [
      '@react-native-community/cli@latest',
      'init',
      projectName,
      '--directory',
      path.join(cwd, projectName),
      '--skip-install',
      '--skip-git-init',
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
    throw new RepackInitError(
      "Failed to create a new project using '@react-native-community/cli'"
    );
  }
}
