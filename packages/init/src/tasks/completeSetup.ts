import { note, outro } from '@clack/prompts';
import chalk from 'chalk';
import dedent from 'dedent';
import type { PackageManager } from '../types/pm.js';

export default function completeSetup(
  projectName: string,
  packageManager: PackageManager,
  projectExists: boolean
) {
  const nextSteps = dedent`
    ${projectExists ? '' : `cd ${projectName}`}
    ${packageManager.runCommand} install
    ${packageManager.runCommand} start

    ${chalk.blue('[ios]')}
    ${packageManager.dlxCommand} pod-install
    ${packageManager.runCommand} run ios
    
    ${chalk.green('[android]')}
    ${packageManager.runCommand} run android
  `;

  note(nextSteps, 'Next steps');
  outro('Done.');
}
