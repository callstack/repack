import path from 'path';
import type { CliOptions, WebpackEnvOptions } from '../../types';
import { DEFAULT_PORT } from '../../env';

export function getWebpackEnvOptions(
  cliOptions: CliOptions
): WebpackEnvOptions {
  const env: WebpackEnvOptions = {};

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
  } else {
    env.mode = 'development';
    env.platform = cliOptions.arguments.start.platform || undefined;
    env.devServer = {
      port: cliOptions.arguments.start.port ?? DEFAULT_PORT,
      host: cliOptions.arguments.start.host,
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
