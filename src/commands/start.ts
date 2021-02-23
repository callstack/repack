import path from 'path';
import { Config } from '@react-native-community/cli-types';
import webpack from 'webpack';
import { CliOptions, StartArguments } from '../types';
import { CLI_OPTIONS_KEY } from '../webpack/utils/parseCliOptions';

export function start(_: string[], config: Config, args: StartArguments) {
  const webpackConfigPath = path.join(config.root, 'webpack.config.js');
  const cliOptions = JSON.stringify({
    config: {
      root: config.root,
      reactNativePath: config.reactNativePath,
      webpackConfigPath,
    },
    command: 'start',
    arguments: {
      // TODO: handle ios and android at the same time
      start: { ...args, platform: 'android' },
    },
  } as CliOptions);

  process.env[CLI_OPTIONS_KEY] = cliOptions;

  const compiler = webpack(require(webpackConfigPath));
  compiler.watch({}, (error) => {
    if (error) {
      console.error(error);
      process.exit(2);
    }
  });
}
