import { Config } from '@react-native-community/cli-types';
import { CliOptions, StartArguments } from '../types';
import { DEFAULT_PORT } from '../webpack/utils/parseCliOptions';
import { DevServerProxy } from '../server';
import { getWebpackConfigPath } from './utils/getWebpackConfigPath';

export function start(_: string[], config: Config, args: StartArguments) {
  const webpackConfigPath = getWebpackConfigPath(config.root);
  const cliOptions: CliOptions = {
    config: {
      root: config.root,
      reactNativePath: config.reactNativePath,
      webpackConfigPath,
    },
    command: 'start',
    arguments: {
      // `platform` is empty, since it will be filled in later by `DevServerProxy`
      start: { ...args, platform: '' },
    },
  };

  const devServerProxy = new DevServerProxy(
    {
      host: args.host,
      port: args.port ?? DEFAULT_PORT,
      https: args.https,
      cert: args.cert,
      key: args.key,
    },
    cliOptions
  );
  devServerProxy.run();
}
