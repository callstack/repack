import { note, outro } from '@clack/prompts';
import chalk from 'chalk';
import dedent from 'dedent';
import type { PM } from 'detect-package-manager';

interface PackageManager {
  name: PM;
  runCommand: string;
  dlxCommand: string;
}

export default function completeSetup(
  projectName: string | undefined,
  packageManager: PackageManager
) {
  note(
    dedent`
    cd ${projectName}
    ${packageManager.runCommand} install
    ${packageManager.runCommand} start

    ${chalk.blue('[ios]')}
    ${packageManager.dlxCommand} pod-install
    ${packageManager.runCommand} run ios
    
    ${chalk.green('[android]')}
    ${packageManager.runCommand} react-native run-android
  `,
    'Next steps'
  );

  outro('Done.');
}
