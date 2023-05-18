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
  templateType: 'mjs' | 'cjs';
  verbose: boolean;
}

export default async function run({ entry, templateType, verbose }: Options) {
  const cwd = process.cwd();

  if (verbose) {
    enableVerboseLogging();
  }

  try {
    const packageManager = checkPackageManager(cwd);
    const reactNativeVersion = checkReactNative(cwd);

    await addDependencies(packageManager);

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
