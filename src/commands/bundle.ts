import { Config } from '@react-native-community/cli-types';
// @ts-ignore
import WebpackCLI from 'webpack-cli';
import { CLI_OPTIONS_ENV_KEY, VERBOSE_ENV_KEY } from '../env';
import { BundleArguments, CliOptions } from '../types';
import { getWebpackConfigPath } from './utils/getWebpackConfigPath';

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
