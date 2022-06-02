import readline from 'readline';
import { Writable } from 'stream';
import { Config } from '@react-native-community/cli-types';
import { createServer } from '@callstack/repack-dev-server';
import { CliOptions, StartArguments } from '../types';
import { DEFAULT_PORT } from '../webpack/utils';
import {
  composeReporters,
  ConsoleReporter,
  BroadcastReporter,
  makeLogEntryFromFastifyLog,
} from '../logging';
import { getWebpackDevServerAdapter } from '../webpack/getWebpackDevServerAdapter';
import { getWebpackConfigPath } from './utils/getWebpackConfigPath';

/**
 * Start command for React Native CLI.
 * It runs `@callstack/repack-dev-server` to provide Development Server functionality to React Native apps
 * in development mode.
 *
 * @param _ Original, non-parsed arguments that were provided when running this command.
 * @param config React Native CLI configuration object.
 * @param args Parsed command line arguments.
 *
 * @internal
 * @category CLI command
 */
export async function start(_: string[], config: Config, args: StartArguments) {
  const webpackConfigPath = getWebpackConfigPath(
    config.root,
    args.webpackConfig
  );
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

  const isVerbose = process.argv.includes('--verbose');
  const reporter = composeReporters([
    new ConsoleReporter({
      isVerbose,
    }),
    new BroadcastReporter({}),
  ]);
  const { getAsset, getMimeType, getSourceFile, getSourceMap, includeFrame } =
    getWebpackDevServerAdapter(cliOptions, reporter);

  const { listen, instance } = await createServer({
    rootDir: cliOptions.config.root,
    server: {
      host: args.host,
      port: args.port ?? DEFAULT_PORT,
      https: args.https
        ? {
            cert: args.cert,
            key: args.key,
          }
        : undefined,
    },
    logger: {
      level: isVerbose ? 'trace' : 'info',
      stream: new Writable({
        write: (chunk, _encoding, callback) => {
          // TODO: route logs are not emitted
          const data = chunk.toString();
          const logEntry = makeLogEntryFromFastifyLog(data);
          logEntry.issuer = 'DevServer';
          reporter.process(logEntry);
          callback();
        },
      }),
    },
    compiler: {
      getAsset,
      getMimeType,
    },
    symbolicate: {
      includeFrame,
      getSourceFile,
      getSourceMap,
    },
  });

  await listen();

  if (args.interactive) {
    if (!process.stdin.setRawMode) {
      instance.log.warn({
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
        // devServerProxy.wsMessageServer.broadcast('reload');
        // devServerProxy.fastify.log.info({
        //   msg: 'Reloading app',
        // });
      } else if (name === 'd') {
        // devServerProxy.wsMessageServer.broadcast('devMenu');
        // devServerProxy.fastify.log.info({
        //   msg: 'Opening developer menu',
        // });
      }
    });
  }
}

// private runAdbReverse(logger: WebpackLogger) {
//   // TODO: add support for multiple devices
//   const adbPath = process.env.ANDROID_HOME
//     ? `${process.env.ANDROID_HOME}/platform-tools/adb`
//     : 'adb';
//   const command = `${adbPath} reverse tcp:${this.config.port} tcp:${this.config.port}`;
//   exec(command, (error) => {
//     if (error) {
//       // Get just the error message
//       const message = error.message.split('error:')[1] || error.message;
//       logger.warn(`Failed to run: ${command} - ${message.trim()}`);
//     } else {
//       logger.info(`Successfully run: ${command}`);
//     }
//   });
// }
