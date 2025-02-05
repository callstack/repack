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
import welcomeMessage from './tasks/welcomeMessage.js';
import logger, { enableVerboseLogging } from './utils/logger.js';
import { cancelPromptAndExit } from './utils/prompts.js';
import spinner from './utils/spinner.js';

interface Options {
  bundler: 'rspack' | 'webpack' | undefined;
  entry: string;
  repackVersion: string | undefined;
  templateType: 'mjs' | 'cjs';
  verbose: boolean;
}

export default async function run(options: Options) {
  const cwd = process.cwd();

  if (options.verbose) {
    enableVerboseLogging();
  }

  try {
    welcomeMessage();

    const { projectRootDir } = await checkProjectExists(cwd);
    const packageManager = await checkPackageManager(projectRootDir);
    checkReactNative(projectRootDir);

    const projectExists = projectRootDir !== undefined;

    const { bundler, projectName, shouldOverrideProject } =
      await collectProjectOptions(cwd, projectExists, {
        bundler: options.bundler,
      });

    spinner.start();

    if (!projectExists) {
      await createNewProject(
        projectName,
        packageManager,
        shouldOverrideProject
      );
    }

    const rootDir = projectRootDir ?? path.join(cwd, projectName!);

    await modifyDependencies(bundler, rootDir, options.repackVersion);

    await createBundlerConfig(
      bundler,
      rootDir,
      options.templateType,
      options.entry
    );

    modifyReactNativeConfig(bundler, rootDir);

    modifyIOS(rootDir);

    spinner.stop('Setup complete.');

    completeSetup(projectName, packageManager, projectExists);
  } catch (error) {
    logger.fatal('Re.Pack setup failed\n\nWhat went wrong:');

    const message = error instanceof Error ? error.message : String(error);
    cancelPromptAndExit(message);
  }
}
