import { note, outro } from '@clack/prompts';
import chalk from 'chalk';
import checkProjectExists from './tasks/checkProjectExists.js';
import checkReactNative from './tasks/checkReactNative.js';
import collectProjectOptions from './tasks/collectProjectOptions.js';
import createBundlerConfig from './tasks/createBundlerConfig.js';
import modifyDependencies from './tasks/modifyDependencies.js';
import modifyIOS from './tasks/modifyIOS.js';
import modifyReactNativeConfig from './tasks/modifyReactNativeConfig.js';

import path from 'node:path';
import dedent from 'dedent';
import checkPackageManager from './tasks/checkPackageManager.js';
import createNewProject from './tasks/createNewProject.js';
import logger, { enableVerboseLogging } from './utils/logger.js';

interface Options {
  bundler: 'rspack' | 'webpack';
  entry: string;
  repackVersion?: string;
  templateType: 'mjs' | 'cjs';
  verbose: boolean;
}

export default async function run({
  entry,
  repackVersion,
  templateType,
  verbose,
}: Options) {
  if (verbose) {
    enableVerboseLogging();
  }

  try {
    const cwd = process.cwd();

    const { projectRootDir } = await checkProjectExists(cwd);
    const packageManager = await checkPackageManager({ projectRootDir });
    checkReactNative({ projectRootDir });

    const { bundler, projectName, shouldCreateProject } =
      await collectProjectOptions({ projectExists: !!projectRootDir });

    if (shouldCreateProject) {
      await createNewProject({ projectName: projectName ?? '' });
    }

    const rootDir = projectRootDir ?? path.join(cwd, projectName!);

    // @ts-ignore
    await modifyDependencies(bundler, rootDir, packageManager, repackVersion);

    await createBundlerConfig(bundler, rootDir, templateType, entry);

    modifyReactNativeConfig(bundler, rootDir);

    modifyIOS(rootDir);

    note(
      dedent`
      cd ${projectName}
      ${packageManager} install
      ${packageManager} start

      ${chalk.blue('[ios]')}
      ${packageManager} pod-install
      ${packageManager} run ios
      
      ${chalk.green('[android]')}
      ${packageManager} run android
    `,
      'Next steps'
    );

    outro('Done.');

    // logger.done('Setup complete. Thanks for using Re.Pack!');
  } catch (error) {
    logger.fatal('Re.Pack setup failed\n\nWhat went wrong:');

    if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error(error as any);
    }

    process.exit(1);
  }
}
