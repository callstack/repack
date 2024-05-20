import ensureProjectExists from './tasks/ensureProjectExists.js';
import checkPackageManager from './tasks/checkPackageManager.js';
import checkReactNative from './tasks/checkReactNative.js';
import addDependencies from './tasks/addDependencies.js';
import createWebpackConfig from './tasks/createWebpackConfig.js';
import handleReactNativeConfig from './tasks/handleReactNativeConfig.js';
import modifyIOS from './tasks/modifyIOS.js';
import modifyAndroid from './tasks/modifyAndroid.js';

import logger, { enableVerboseLogging } from './utils/logger.js';

interface Options {
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
    const { cwd, rootDir } = await ensureProjectExists();
    const packageManager = await checkPackageManager(rootDir);
    const reactNativeVersion = checkReactNative(cwd);

    await addDependencies(cwd, packageManager, repackVersion);

    await createWebpackConfig(cwd, templateType, entry);

    handleReactNativeConfig(cwd);

    modifyAndroid(cwd, reactNativeVersion);

    modifyIOS(cwd);

    logger.done('Setup complete. Thanks for using Re.Pack!');
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
