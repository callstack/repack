import { Config } from '@react-native-community/cli-types';
// @ts-ignore
import WebpackCLI from 'webpack-cli';
import { CLI_OPTIONS_ENV_KEY, VERBOSE_ENV_KEY } from '../env';
import { BundleArguments, CliOptions } from '../types';
import { getWebpackConfigPath } from './utils/getWebpackConfigPath';

/**
 * Bundle command for React Native CLI.
 * It runs Webpack, builds bundle and saves it alongside any other assets and Source Map
 * to filesystem.
 *
 * @param _ Original, non-parsed arguments that were provided when running this command.
 * @param config React Native CLI configuration object.
 * @param args Parsed command line arguments.
 *
 * @internal
 */
export function bundle(_: string[], config: Config, args: BundleArguments) {
  const webpackConfigPath = getWebpackConfigPath(config.root);
  const cliOptions = JSON.stringify({
    config: {
      root: config.root,
      reactNativePath: config.reactNativePath,
      webpackConfigPath,
    },
    command: 'bundle',
    arguments: {
      bundle: args,
    },
  } as CliOptions);

  process.env[CLI_OPTIONS_ENV_KEY] = cliOptions;
  if (process.argv.includes('--verbose')) {
    process.env[VERBOSE_ENV_KEY] = '1';
  }

  // TODO: use webpack directly
  const webpackCLI = new WebpackCLI();
  webpackCLI
    .run(['-c', webpackConfigPath], { from: 'user' })
    .catch((error: any) => {
      console.error(error);
      process.exit(1);
    });
}
