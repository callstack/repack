import { Config } from '@react-native-community/cli-types';
// @ts-ignore
import WebpackCLI from 'webpack-cli';
import { BundleArguments, CliOptions } from '../types';
import { CLI_OPTIONS_KEY } from '../webpack/utils/parseCliOptions';
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

  process.env[CLI_OPTIONS_KEY] = cliOptions;

  // TODO: use webpack directly
  const webpackCLI = new WebpackCLI();
  webpackCLI
    .run(['-c', webpackConfigPath], { from: 'user' })
    .catch((error: any) => {
      console.error(error);
      process.exit(1);
    });
}
