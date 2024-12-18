import addDependencies from './tasks/addDependencies.ts';
import checkPackageManager from './tasks/checkPackageManager.ts';
import checkReactNative from './tasks/checkReactNative.ts';
import createBundlerConfig from './tasks/createBundlerConfig.ts';
import ensureProjectExists from './tasks/ensureProjectExists.ts';
import handleReactNativeConfig from './tasks/handleReactNativeConfig.ts';
import modifyAndroid from './tasks/modifyAndroid.ts';
import modifyIOS from './tasks/modifyIOS.ts';

import logger, { enableVerboseLogging } from './utils/logger.ts';

interface Options {
  bundler: 'rspack' | 'webpack';
  entry: string;
  repackVersion?: string;
  templateType: 'mjs' | 'cjs';
  verbose: boolean;
}

export default async function run({
  bundler,
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

    await addDependencies(bundler, cwd, packageManager, repackVersion);

    await createBundlerConfig(bundler, cwd, templateType, entry);

    handleReactNativeConfig(bundler, cwd);

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
