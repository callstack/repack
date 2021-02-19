import path from 'path';
import { Config } from '@react-native-community/cli-types';
// @ts-ignore
import WebpackCLI from 'webpack-cli';
import { Arguments } from '../types';
import { CLI_OPTIONS_KEY } from '../webpack/utils/parseCliOptions';

export function bundle(_: string[], config: Config, args: Arguments) {
  const webpackConfigPath = path.join(config.root, 'webpack.config.js');
  const cliOptions = JSON.stringify({
    config: {
      root: config.root,
      reactNativePath: config.reactNativePath,
      webpackConfigPath,
    },
    arguments: args,
  });

  process.env[CLI_OPTIONS_KEY] = cliOptions;

  const webpackCLI = new WebpackCLI();
  webpackCLI
    .run(['-c', webpackConfigPath], { from: 'user' })
    .catch((error: any) => {
      console.error(error);
      process.exit(1);
    });
}
