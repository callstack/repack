import readline from 'readline';
import { Config } from '@react-native-community/cli-types';
import { CliOptions, StartArguments } from '../types';
import { DEFAULT_PORT } from '../webpack/utils/parseCliOptions';
import { DevServerProxy } from '../server';
import { VERBOSE_ENV_KEY } from '../env';
import { getWebpackConfigPath } from './utils/getWebpackConfigPath';

/**
 * Start command for React Native CLI.
 * It runs {@link DevServerProxy} to provide Development Server functionality to React Native apps
 * in development mode.
 *
 * @param _ Original, non-parsed arguments that were provided when running this command.
 * @param config React Native CLI configuration object.
 * @param args Parsed command line arguments.
 *
 * @internal
 */
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
      platform: args.platform,
    },
    cliOptions
  );
  devServerProxy.run();

  if (args.interactive) {
    if (!process.stdin.setRawMode) {
      devServerProxy.fastify.log.warn({
        msg: 'Interactive mode is not supported in this environment',
      });
    }

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);

    process.stdin.on('keypress', (_key, data) => {
      const { ctrl, name } = data;
      if (ctrl === true) {
        switch (name) {
          case 'c':
            process.exit();
            break;
          case 'z':
            process.emit('SIGTSTP', 'SIGTSTP');
            break;
        }
      } else if (name === 'r') {
        devServerProxy.wsMessageServer.broadcast('reload');
        devServerProxy.fastify.log.info({
          msg: 'Reloading app',
        });
      } else if (name === 'd') {
        devServerProxy.wsMessageServer.broadcast('devMenu');
        devServerProxy.fastify.log.info({
          msg: 'Opening developer menu',
        });
      }
    });
  }
}
