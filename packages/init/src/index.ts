import path from 'node:path';

import checkPackageManager from './tasks/checkPackageManager.js';
import checkProjectExists from './tasks/checkProjectExists.js';
import checkRepositoryExists from './tasks/checkRepositoryExists.js';
import collectProjectOptions from './tasks/collectProjectOptions.js';
import completeSetup from './tasks/completeSetup.js';
import createBundlerConfig from './tasks/createBundlerConfig.js';
import createNewProject from './tasks/createNewProject.js';
import modifyDependencies from './tasks/modifyDependencies.js';
import modifyIOS from './tasks/modifyIOS.js';
import modifyReactNativeConfig from './tasks/modifyReactNativeConfig.js';
import setupGit from './tasks/setupGit.js';
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
  const cwd = process.env.PWD ?? process.cwd();

  if (options.verbose) {
    enableVerboseLogging();
  }

  try {
    welcomeMessage();

    const repoRootDir = await checkRepositoryExists(cwd);
    const projectExists = checkProjectExists(cwd);
    const packageManager = await checkPackageManager(repoRootDir);

    const { bundler, projectName, shouldOverrideProject } =
      await collectProjectOptions(cwd, projectExists, {
        bundler: options.bundler,
      });

    spinner.start();

    if (!projectExists) {
      await createNewProject(
        cwd,
        projectName,
        packageManager,
        shouldOverrideProject
      );
    }

    const projectRootDir = projectExists ? cwd : path.join(cwd, projectName!);

    await modifyDependencies(bundler, projectRootDir, options.repackVersion);

    await createBundlerConfig(
      bundler,
      projectRootDir,
      options.templateType,
      options.entry
    );

    modifyReactNativeConfig(bundler, projectRootDir);

    modifyIOS(projectRootDir);

    if (!projectExists) {
      await setupGit(projectRootDir);
    }

    spinner.stop('Setup complete.');

    completeSetup(projectName, packageManager, projectExists);
  } catch (error) {
    logger.fatal('Re.Pack setup failed\n\nWhat went wrong:');

    const message = error instanceof Error ? error.message : String(error);
    cancelPromptAndExit(message);
  }
}
