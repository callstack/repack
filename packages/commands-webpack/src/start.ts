import { URL } from 'node:url';
import webpack from 'webpack';
import type { Server } from '@callstack/repack-dev-server';
import { parseFileUrl, runAdbReverse, setupInteractions } from '../common';
import { DEFAULT_HOSTNAME, DEFAULT_PORT } from '../consts';
import { StartArguments, StartCliOptions } from '../types';
import { Compiler } from './Compiler';
import { HMRMessageBody } from './types';

/**
 * Start command for React Native Community CLI.
 * It runs `@callstack/repack-dev-server` to provide Development Server functionality to React Native apps
 * in development mode.
 *
 * @param _ Original, non-parsed arguments that were provided when running this command.
 * @param config React Native Community CLI configuration object.
 * @param args Parsed command line arguments.
 *
 * @internal
 * @category CLI command
 */
export async function start(_: string[], config: Config, args: StartArguments) {
  const compiler = new Compiler(cliOptions, reporter, isVerbose);

  const { createServer } = await import('@callstack/repack-dev-server');
  const { start, stop } = await createServer({
    options: {
      rootDir: cliOptions.config.root,
      host: args.host || DEFAULT_HOSTNAME,
      port: args.port ?? DEFAULT_PORT,
      https: args.https
        ? {
            cert: args.cert,
            key: args.key,
          }
        : undefined,
      logRequests: showHttpRequests,
    },
    experiments: {
      experimentalDebugger: args.experimentalDebugger,
    },
    delegate: (ctx): Server.Delegate => {
      if (args.interactive) {
        setupInteractions(
          {
            onReload: () => {
              ctx.broadcastToMessageClients({ method: 'reload' });
            },
            onOpenDevMenu: () => {
              ctx.broadcastToMessageClients({ method: 'devMenu' });
            },
          },
          ctx.log
        );
      }

      if (reversePort && args.port) {
        void runAdbReverse(args.port, ctx.log);
      }

      const lastStats: Record<string, webpack.StatsCompilation> = {};

      compiler.on('watchRun', ({ platform }) => {
        ctx.notifyBuildStart(platform);
        if (platform === 'android') {
          void runAdbReverse(args.port ?? DEFAULT_PORT, ctx.log);
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
          stats: webpack.StatsCompilation;
        }) => {
          ctx.notifyBuildEnd(platform);
          lastStats[platform] = stats;
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
            return compiler.getSource(filename, platform);
          },
          getSourceMap: (fileUrl) => {
            const { filename, platform } = parseFileUrl(fileUrl);
            if (!platform) {
              throw new Error('Cannot infer platform for file URL');
            }

            return compiler.getSourceMap(filename, platform);
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
              { action: 'sync', body: createHmrBody(lastStats[platform]) },
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
          getPlatforms: () => Promise.resolve(Object.keys(compiler.workers)),
          getAssets: (platform) =>
            Promise.resolve(
              Object.entries(compiler.assetsCache[platform] ?? {}).map(
                ([name, asset]) => ({ name, size: asset.size })
              )
            ),
          getCompilationStats: (platform) =>
            Promise.resolve(compiler.statsCache[platform] ?? null),
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

function createHmrBody(
  stats?: webpack.StatsCompilation
): HMRMessageBody | null {
  if (!stats) {
    return null;
  }

  return {
    name: stats.name ?? '',
    time: stats.time ?? 0,
    hash: stats.hash ?? '',
    warnings: stats.warnings || [],
    errors: stats.errors || [],
  };
}
