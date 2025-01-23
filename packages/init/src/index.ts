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

    const { bundler, projectName, shouldCreateProject } =
      await collectProjectOptions(cwd, projectRootDir !== undefined);

    if (shouldCreateProject) {
      await createNewProject({ projectName: projectName ?? '' });
    }

    const rootDir = projectRootDir ?? path.join(cwd, projectName!);

    await modifyDependencies(bundler, rootDir, repackVersion);

    await createBundlerConfig(bundler, rootDir, templateType, entry);

    modifyReactNativeConfig(bundler, rootDir);

    modifyIOS(rootDir);

    completeSetup(projectName, packageManager);
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
