import type { Config } from '@react-native-community/cli-types';
import type { Configuration } from '@rspack/core';
import * as colorette from 'colorette';
import packageJson from '../../../package.json';
import { VERBOSE_ENV_KEY } from '../../env.js';
import {
  ConsoleReporter,
  FileReporter,
  type Reporter,
  composeReporters,
  makeLogEntryFromFastifyLog,
} from '../../logging/index.js';
import {
  getEnvOptions,
  getMimeType,
  getRspackConfigFilePath,
  loadConfig,
  normalizeConfig,
  parseFileUrl,
  runAdbReverse,
  setupInteractions,
} from '../common/index.js';
import type { StartArguments, StartCliOptions } from '../types.js';
import { Compiler } from './Compiler.js';

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
export async function start(
  _: string[],
  cliConfig: Config,
  args: StartArguments
) {
  const rspackConfigPath = getRspackConfigFilePath(
    cliConfig.root,
    args.config ?? args.webpackConfig
  );

  const cliOptions: StartCliOptions = {
    config: {
      root: cliConfig.root,
      platforms: Object.keys(cliConfig.platforms),
      bundlerConfigPath: rspackConfigPath,
      reactNativePath: cliConfig.reactNativePath,
    },
    command: 'start',
    arguments: { start: args },
  };

  const env = getEnvOptions(cliOptions);
  const config = await loadConfig<Configuration>(
    cliOptions.config.bundlerConfigPath
  );
  const options = await Promise.all(
    cliOptions.config.platforms.map((platform) => {
      return normalizeConfig(config, { ...env, platform });
    })
  );

  const devServerOptions = options[0].devServer ?? {};
  const watchOptions = options[0].watchOptions ?? {};

  const serverProtocol =
    typeof devServerOptions.server === 'string'
      ? devServerOptions.server
      : devServerOptions.server!.type;
  const serverHost = devServerOptions.host!;
  const serverPort = devServerOptions.port!;
  const serverURL = `${serverProtocol}://${serverHost}:${serverPort}`;
  const showHttpRequests = args.verbose || args.logRequests;

  if (args.platform && !cliOptions.config.platforms.includes(args.platform)) {
    throw new Error('Unrecognized platform: ' + args.platform);
  }

  if (args.verbose) {
    process.env[VERBOSE_ENV_KEY] = '1';
  }

  const reporter = composeReporters(
    [
      new ConsoleReporter({ asJson: args.json, isVerbose: args.verbose }),
      args.logFile ? new FileReporter({ filename: args.logFile }) : undefined,
    ].filter(Boolean) as Reporter[]
  );

  const version = packageJson.version;
  process.stdout.write(
    colorette.bold(colorette.cyan('📦 Re.Pack ' + version + '\n\n'))
  );

  const compiler = new Compiler(cliOptions, reporter);
  compiler.init(options, watchOptions);

  const { createServer } = await import('@callstack/repack-dev-server');
  const { start, stop } = await createServer({
    options: {
      ...devServerOptions,
      rootDir: cliOptions.config.root,
      logRequests: showHttpRequests,
    },
    delegate: (ctx) => {
      if (args.interactive) {
        setupInteractions(
          {
            onReload() {
              ctx.broadcastToMessageClients({ method: 'reload' });
            },
            onOpenDevMenu() {
              ctx.broadcastToMessageClients({ method: 'devMenu' });
            },
            onOpenDevTools() {
              void fetch(`${serverURL}/open-debugger`, {
                method: 'POST',
              });
            },
            onAdbReverse() {
              void runAdbReverse({
                port: serverPort,
                logger: ctx.log,
                verbose: true,
              });
            },
          },
          { logger: ctx.log }
        );
      }

      if (args.reversePort) {
        void runAdbReverse({ logger: ctx.log, port: serverPort, wait: true });
      }

      compiler.setDevServerContext(ctx);

      return {
        compiler: {
          getAsset: (filename, platform) => {
            const parsedUrl = parseFileUrl(filename, 'file:///');
            return compiler.getSource(parsedUrl.filename, platform);
          },
          getMimeType: (filename) => getMimeType(filename),
          inferPlatform: (uri) => {
            const { platform } = parseFileUrl(uri, 'file:///');
            return platform;
          },
        },
        symbolicator: {
          getSource: (fileUrl) => {
            const { filename, platform } = parseFileUrl(fileUrl);
            return compiler.getSource(filename, platform);
          },
          getSourceMap: (fileUrl) => {
            const { filename, platform } = parseFileUrl(fileUrl);
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
              { action: 'sync', body: compiler.getHmrBody(platform) },
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
          getPlatforms: () => Promise.resolve(compiler.platforms),
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
  compiler.start();

  return {
    stop: async () => {
      reporter.stop();
      await stop();
    },
  };
}
