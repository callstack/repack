import path from 'node:path';
import type { EnvOptions } from '../../types.js';
import { DEFAULT_HOSTNAME, DEFAULT_PORT } from '../consts.js';
import type { CliOptions } from '../types.js';

export function getEnvOptions(cliOptions: CliOptions): EnvOptions {
  const env: EnvOptions = {
    bundleFilename: '',
    context: cliOptions.config.root,
    reactNativePath: cliOptions.config.reactNativePath,
  };

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
