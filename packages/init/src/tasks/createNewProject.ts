import path from 'node:path';
import { execa } from 'execa';
import versionsJson from '../../versions.json' with { type: 'json' };
import type { PackageManager } from '../types/pm.js';
import { RepackInitError } from '../utils/error.js';
import spinner from '../utils/spinner.js';

function getCreateCommand(packageManager: PackageManager) {
  if (packageManager.name === 'npm') {
    // Use `npm exec` with the package's explicit bin name. Nested `npx`
    // invocations can fail when repack-init itself is launched through `npx`.
    return {
      command: packageManager.runCommand,
      args: [
        'exec',
        '--yes',
        '--package',
        '@react-native-community/cli@latest',
        '--',
        'rnc-cli',
      ],
      shell: false,
    };
  }

  return {
    command: packageManager.dlxCommand,
    args: ['@react-native-community/cli@latest'],
    shell: true,
  };
}

function getReactNativeVersion() {
  const version = versionsJson['react-native'];

  return /^\d+\.\d+$/.test(version) ? `${version}.0` : version;
}

export default async function createNewProject(
  cwd: string,
  projectName: string,
  packageManager: PackageManager,
  override: boolean
) {
  try {
    const createCommand = getCreateCommand(packageManager);
    const args = [
      ...createCommand.args,
      'init',
      projectName,
      '--directory',
      path.join(cwd, projectName),
      '--version',
      getReactNativeVersion(),
      '--skip-install',
      '--skip-git-init',
    ];

    if (override) {
      args.push('--replace-directory');
    }

    spinner.message(
      'Creating new project from the React Native Community Template'
    );

    return await execa(createCommand.command, args, {
      stdio: 'ignore',
      shell: createCommand.shell,
    });
  } catch {
    throw new RepackInitError(
      "Failed to create a new project using '@react-native-community/cli'"
    );
  }
}
