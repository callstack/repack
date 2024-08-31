import path from 'node:path';
import type { EnvOptions } from '../../types';
import { DEFAULT_HOSTNAME, DEFAULT_PORT } from '../consts';
import type { CliOptions } from '../types';

export function getEnvOptions(cliOptions: CliOptions): EnvOptions {
  const env: EnvOptions = { bundleFilename: '' };

  env.context = cliOptions.config.root;
  env.reactNativePath = cliOptions.config.reactNativePath;

  if ('bundle' in cliOptions.arguments) {
    env.mode = cliOptions.arguments.bundle.dev ? 'development' : 'production';
    env.platform = cliOptions.arguments.bundle.platform;
    env.minimize =
      cliOptions.arguments.bundle.minify ?? env.mode === 'production';

    const { entryFile } = cliOptions.arguments.bundle;
    env.entry =
      path.isAbsolute(entryFile) || entryFile.startsWith('./')
        ? entryFile
        : `./${entryFile}`;

    env.bundleFilename = cliOptions.arguments.bundle.bundleOutput;
    env.sourceMapFilename = cliOptions.arguments.bundle.sourcemapOutput;
    env.assetsPath = cliOptions.arguments.bundle.assetsDest;
  } else {
    env.mode = 'development';
    env.devServer = {
      port: cliOptions.arguments.start.port ?? DEFAULT_PORT,
      host: cliOptions.arguments.start.host || DEFAULT_HOSTNAME,
      https: cliOptions.arguments.start.https
        ? {
            cert: cliOptions.arguments.start.cert,
            key: cliOptions.arguments.start.key,
          }
        : undefined,
      hmr: true,
    };
  }

  return env;
}
