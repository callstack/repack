import path from 'node:path';

import checkPackageManager from './tasks/checkPackageManager.js';
import checkProjectExists from './tasks/checkProjectExists.js';
import checkReactNative from './tasks/checkReactNative.js';
import collectProjectOptions from './tasks/collectProjectOptions.js';
import completeSetup from './tasks/completeSetup.js';
import createBundlerConfig from './tasks/createBundlerConfig.js';
import createNewProject from './tasks/createNewProject.js';
import modifyDependencies from './tasks/modifyDependencies.js';
import modifyIOS from './tasks/modifyIOS.js';
import modifyReactNativeConfig from './tasks/modifyReactNativeConfig.js';

import logger, { enableVerboseLogging } from './utils/logger.js';
import spinner from './utils/spinner.js';

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
    const packageManager = await checkPackageManager(projectRootDir);
    checkReactNative(projectRootDir);

    const projectExists = projectRootDir !== undefined;

    const { bundler, projectName, shouldOverrideProject } =
      await collectProjectOptions(cwd, projectExists);

    spinner.start();

    if (!projectExists) {
      await createNewProject(
        projectName,
        packageManager,
        shouldOverrideProject
      );
    }

    const rootDir = projectRootDir ?? path.join(cwd, projectName!);

    await modifyDependencies(bundler, rootDir, repackVersion);

    await createBundlerConfig(bundler, rootDir, templateType, entry);

    modifyReactNativeConfig(bundler, rootDir);

    modifyIOS(rootDir);

    spinner.stop('Setup complete.');

    completeSetup(projectName, packageManager);
  } catch (error) {
    logger.error('Re.Pack setup failed\n\nWhat went wrong:');

    if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error(error as any);
    }

    process.exit(1);
  }
}
