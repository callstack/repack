import { Config } from '@react-native-community/cli-types';
import { CliOptions, StartArguments } from '../types';
import { DEFAULT_PORT } from '../webpack/utils/parseCliOptions';
import { DevServerProxy } from '../server';
import { VERBOSE_ENV_KEY } from '../env';
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

  if (process.argv.includes('--verbose')) {
    process.env[VERBOSE_ENV_KEY] = '1';
  }

  const devServerProxy = new DevServerProxy(
    {
      host: args.host,
      port: args.port ?? DEFAULT_PORT,
      https: args.https,
      cert: args.cert,
      key: args.key,
      context: config.root,
    },
    cliOptions
  );
  devServerProxy.run();
}
