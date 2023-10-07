import readline from 'readline';
import { URL, pathToFileURL } from 'url';
import execa from 'execa';
import { Config } from '@react-native-community/cli-types';
import type { Server } from '@callstack/repack-dev-server';
import {
  CliOptions,
  HMRMessageBody,
  StartArguments,
  StatsCompilation,
} from '../types';
import { DEFAULT_PORT } from '../env';
import {
  composeReporters,
  ConsoleReporter,
  FileReporter,
  makeLogEntryFromFastifyLog,
  Reporter,
} from '../logging';
import { Compiler } from '../webpack/Compiler';
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
  const { reversePort: reversePortArg, ...restArgs } = args;
  const cliOptions: CliOptions = {
    config: {
      root: config.root,
      reactNativePath: config.reactNativePath,
      webpackConfigPath,
    },
    command: 'start',
    arguments: {
      // `platform` is empty, since it will be filled in later by `DevServerProxy`
      start: { ...restArgs, platform: '' },
    },
  };

  const reversePort = reversePortArg ?? process.argv.includes('--reverse-port');
  const isSilent = args.silent;
  const isVerbose = isSilent
    ? false
    : args.verbose ?? process.argv.includes('--verbose');
  const reporter = composeReporters(
    [
      new ConsoleReporter({
        asJson: args.json,
        level: isSilent ? 'silent' : isVerbose ? 'verbose' : 'normal',
      }),
      args.logFile ? new FileReporter({ filename: args.logFile }) : undefined,
    ].filter(Boolean) as Reporter[]
  );
  const compiler = new Compiler(cliOptions, reporter, isVerbose);

  const { createServer } = await import('@callstack/repack-dev-server');
  const { start, stop } = await createServer({
    options: {
      rootDir: cliOptions.config.root,
      host: args.host,
      port: args.port ?? DEFAULT_PORT,
      https: args.https
        ? {
            cert: args.cert,
            key: args.key,
          }
        : undefined,
    },
    delegate: (ctx): Server.Delegate => {
      if (args.interactive) {
        bindKeypressInput(ctx);
      }

      if (reversePort && args.port) {
        runAdbReverse(ctx, args.port);
      }

      let lastStats: StatsCompilation | undefined;

      compiler.on('watchRun', ({ platform }) => {
        ctx.notifyBuildStart(platform);
        if (platform === 'android') {
          runAdbReverse(ctx, args.port ?? DEFAULT_PORT);
        }
      });

      compiler.on('invalid', ({ platform }) => {
        ctx.notifyBuildStart(platform);
        ctx.broadcastToHmrClients({ action: 'building' }, platform);
      });

      compiler.on(
        'done',
        ({
          platform,
          stats,
        }: {
          platform: string;
          stats: StatsCompilation;
        }) => {
          ctx.notifyBuildEnd(platform);
          lastStats = stats;
          ctx.broadcastToHmrClients(
            { action: 'built', body: createHmrBody(stats) },
            platform
          );
        }
      );

      return {
        compiler: {
          getAsset: async (filename, platform, sendProgress) =>
            (await compiler.getAsset(filename, platform, sendProgress)).data,
          getMimeType: (filename) => compiler.getMimeType(filename),
          inferPlatform: (uri) => {
            const url = new URL(uri, 'protocol://domain');
            if (!url.searchParams.get('platform')) {
              const [, platform] = /^\/(.+)\/.+$/.exec(url.pathname) ?? [];
              return platform;
            }

            return undefined;
          },
        },
        symbolicator: {
          getSource: (fileUrl) => {
            const { filename, platform } = parseFileUrl(fileUrl);
            return compiler.getSource(filename, platform || 'ios');
          },
          getSourceMap: (fileUrl) => {
            const { filename, platform } = parseFileUrl(fileUrl);
            // if (!platform) {
            //   throw new Error('Cannot infer platform for file URL');
            // }

            return compiler.getSourceMap(filename, platform || 'ios');
          },
          shouldIncludeFrame: (frame) => {
            // If the frame points to internal bootstrap/module system logic, skip the code frame.
            return !/webpack[/\\]runtime[/\\].+\s/.test(frame.file);
          },
        },
        hmr: {
          getUriPath: () => '/__hmr',
          onClientConnected: (platform, clientId) => {
            ctx.broadcastToHmrClients(
              { action: 'sync', body: createHmrBody(lastStats) },
              platform,
              [clientId]
            );
          },
        },
        messages: {
          getHello: () => 'React Native packager is running',
          getStatus: () => 'packager-status:running',
        },
        logger: {
          onMessage: (log) => {
            const logEntry = makeLogEntryFromFastifyLog(log);
            logEntry.issuer = 'DevServer';
            reporter.process(logEntry);
          },
        },
        api: {
          getPlatforms: async () => Object.keys(compiler.workers),
          getAssets: async (platform) =>
            Object.entries(compiler.assetsCache[platform] ?? {}).map(
              ([name, asset]) => ({
                name,
                size: asset.size,
              })
            ),
          getCompilationStats: async (platform) =>
            compiler.statsCache[platform] ?? null,
        },
      };
    },
  });

  await start();

  return {
    stop: async () => {
      reporter.stop();
      await stop();
    },
  };
}

function bindKeypressInput(ctx: Server.DelegateContext) {
  if (!process.stdin.setRawMode) {
    ctx.log.warn({
      msg: 'Interactive mode is not supported in this environment',
    });
    return;
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
      ctx.broadcastToMessageClients({ method: 'reload' });
      ctx.log.info({
        msg: 'Reloading app',
      });
    } else if (name === 'd') {
      ctx.broadcastToMessageClients({ method: 'devMenu' });
      ctx.log.info({
        msg: 'Opening developer menu',
      });
    }
  });
}

async function runAdbReverse(ctx: Server.DelegateContext, port: number) {
  const adbPath = process.env.ANDROID_HOME
    ? `${process.env.ANDROID_HOME}/platform-tools/adb`
    : 'adb';
  const command = `${adbPath} reverse tcp:${port} tcp:${port}`;
  try {
    await execa.command(command);
    ctx.log.info(`Successfully run: ${command}`);
  } catch (error) {
    // Get just the error message
    const message =
      (error as Error).message.split('error:')[1] || (error as Error).message;
    ctx.log.warn(`Failed to run: ${command} - ${message.trim()}`);
  }
}

function parseFileUrl(fileUrl: string) {
  let url: URL;
  if (fileUrl.startsWith('http')) {
    url = new URL(fileUrl);
  } else {
    url = pathToFileURL('/' + fileUrl);
  }
  const { pathname: filename, searchParams } = url;
  let platform = searchParams.get('platform');
  if (!platform) {
    platform = 'ios';
    // const [, platformOrName, name] = filename.split('.').reverse();
    // if (name !== undefined) {
    //   platform = platformOrName;
    // }
  }

  return {
    filename: filename.replace(/^\//, ''),
    platform: platform || undefined,
  };
}

function createHmrBody(stats?: StatsCompilation): HMRMessageBody | null {
  if (!stats) {
    return null;
  }

  const modules: Record<string, string> = {};
  for (const module of stats.modules ?? []) {
    const { identifier, name } = module;
    if (identifier !== undefined && name) {
      modules[identifier] = name;
    }
  }

  return {
    name: stats.name ?? '',
    time: stats.time ?? 0,
    hash: stats.hash ?? '',
    warnings: stats.warnings || [],
    errors: stats.errors || [],
    modules,
  };
}
