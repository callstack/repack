import type { Configuration } from '@rspack/core';
import packageJson from '../../../package.json';
import {
  ConsoleReporter,
  FileReporter,
  type Reporter,
  composeReporters,
  makeLogEntryFromFastifyLog,
} from '../../logging/index.js';
import { CLIError } from '../common/cliError.js';
import { makeCompilerConfig } from '../common/config/makeCompilerConfig.js';
import {
  getMimeType,
  parseUrl,
  resetPersistentCache,
  resolveProjectPath,
  setupInteractions,
} from '../common/index.js';
import { runAdbReverse } from '../common/index.js';
import logo from '../common/logo.js';
import { setupEnvironment } from '../common/setupEnvironment.js';
import type { CliConfig, StartArguments } from '../types.js';
import { Compiler } from './Compiler.js';

/**
 * Start command that runs a development server.
 * It runs `@callstack/repack-dev-server` to provide Development Server functionality
 * in development mode.
 *
 * @param _ Original, non-parsed arguments that were provided when running this command.
 * @param cliConfig Configuration object containing platform and project settings.
 * @param args Parsed command line arguments.
 */
export async function start(
  _: string[],
  cliConfig: CliConfig,
  args: StartArguments
) {
  const detectedPlatforms = Object.keys(cliConfig.platforms);

  if (args.platform && !detectedPlatforms.includes(args.platform)) {
    throw new CLIError(`Unrecognized platform: ${args.platform}`);
  }

  const platforms = args.platform ? [args.platform] : detectedPlatforms;

  const configs = await makeCompilerConfig<Configuration>({
    args: args,
    bundler: 'rspack',
    command: 'start',
    rootDir: cliConfig.root,
    platforms: platforms,
    reactNativePath: cliConfig.reactNativePath,
  });

  // expose selected args as environment variables
  setupEnvironment(args);

  const devServerOptions = configs[0].devServer ?? {};
  const showHttpRequests = args.verbose || args.logRequests;

  const reporter = composeReporters(
    [
      new ConsoleReporter({ asJson: args.json, isVerbose: args.verbose }),
      args.logFile ? new FileReporter({ filename: args.logFile }) : undefined,
    ].filter(Boolean) as Reporter[]
  );

  process.stdout.write(logo(packageJson.version, 'Rspack'));

  if (args.resetCache) {
    resetPersistentCache({
      bundler: 'rspack',
      rootDir: cliConfig.root,
      cacheConfigs: configs.map((config) => config.experiments?.cache),
    });
  }

  if (process.env.RSPACK_PROFILE) {
    const { applyProfile } = await import('./profile.js');
    await applyProfile(
      process.env.RSPACK_PROFILE,
      process.env.RSPACK_TRACE_LAYER,
      process.env.RSPACK_TRACE_OUTPUT
    );
  }

  const compiler = new Compiler(configs, reporter, cliConfig.root);

  const { createServer } = await import('@callstack/repack-dev-server');
  const { start, stop } = await createServer({
    options: {
      ...devServerOptions,
      rootDir: cliConfig.root,
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
              fetch(`${ctx.options.url}/open-debugger`, {
                method: 'POST',
              }).catch(() => {
                ctx.log.warn('Failed to open React Native DevTools');
              });
            },
            onAdbReverse() {
              void runAdbReverse({
                port: ctx.options.port,
                logger: ctx.log,
                verbose: true,
              });
            },
          },
          { logger: ctx.log }
        );
      }

      if (args.reversePort) {
        void runAdbReverse({
          logger: ctx.log,
          port: ctx.options.port,
          wait: true,
        });
      }

      compiler.setDevServerContext(ctx);

      return {
        compiler: {
          getAsset: (url, platform) => {
            const { resourcePath } = parseUrl(url, platforms);
            return compiler.getSource(resourcePath, platform);
          },
          getMimeType: (filename) => {
            return getMimeType(filename);
          },
          inferPlatform: (url) => {
            const { platform } = parseUrl(url, platforms);
            return platform;
          },
        },
        devTools: {
          resolveProjectPath: (filepath) => {
            return resolveProjectPath(filepath, cliConfig.root);
          },
        },
        symbolicator: {
          getSource: (url) => {
            let { resourcePath, platform } = parseUrl(url, platforms);
            resourcePath = resolveProjectPath(resourcePath, cliConfig.root);
            return compiler.getSource(resourcePath, platform);
          },
          getSourceMap: (url) => {
            const { resourcePath, platform } = parseUrl(url, platforms);
            return compiler.getSourceMap(resourcePath, platform);
          },
          shouldIncludeFrame: (frame) => {
            // If the frame points to internal bootstrap/module system logic, skip the code frame.
            return !/webpack[/\\]runtime[/\\].+\s/.test(frame.file);
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
