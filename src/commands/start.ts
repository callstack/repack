import path from 'path';
import { Config } from '@react-native-community/cli-types';
import { CliOptions, StartArguments } from '../types';
import { DEFAULT_PORT } from '../webpack/utils/parseCliOptions';
import { DevServerProxy } from '../server';
// require('inspector').open(undefined, undefined, true);

export function start(_: string[], config: Config, args: StartArguments) {
  const webpackConfigPath = path.join(config.root, 'webpack.config.js');
  const cliOptions: CliOptions = {
    config: {
      root: config.root,
      reactNativePath: config.reactNativePath,
      webpackConfigPath,
    },
    command: 'start',
    arguments: {
      start: { ...args, platform: '' },
    },
  };

  const devServerProxy = new DevServerProxy({
    host: args.host,
    port: args.port ?? DEFAULT_PORT,
    https: args.https,
    cert: args.cert,
    key: args.key,
  });
  devServerProxy.run(cliOptions);
}
