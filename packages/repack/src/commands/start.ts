import packageJson from '../../package.json';
import { VERBOSE_ENV_KEY } from '../env.js';
import { CLIError, isTruthyEnv } from '../helpers/index.js';
import {
  ConsoleReporter,
  FileReporter,
  type Reporter,
  composeReporters,
  makeLogEntryFromFastifyLog,
} from '../logging/index.js';
import { detectBundler } from './common/config/detectBundler.js';
import { makeCompilerConfig } from './common/config/makeCompilerConfig.js';
import {
  getDevMiddleware,
  getMaxWorkers,
  getMimeType,
  parseUrl,
  resetPersistentCache,
  resolveProjectPath,
  runAdbReverse,
  setupEnvironment,
  setupInteractions,
  setupRspackEnvironment,
} from './common/index.js';
import logo from './common/logo.js';
import type {
  Bundler,
  CliConfig,
  CompilerInterface,
  StartArguments,
} from './types.js';

/**
 * Unified start command that runs a development server.
 * It runs `@callstack/repack-dev-server` to provide Development Server functionality
 * in development mode.
 *
 * Auto-detects the bundler engine (rspack or webpack) unless explicitly specified.
 *
 * @param _ Original, non-parsed arguments that were provided when running this command.
 * @param cliConfig Configuration object containing platform and project settings.
 * @param args Parsed command line arguments.
 * @param forcedBundler Optional bundler override from deprecated entry points.
 */
export async function start(
  _: string[],
  cliConfig: CliConfig,
  args: StartArguments,
  forcedBundler?: Bundler
) {
  const bundler =
    forcedBundler ??
    detectBundler(
      cliConfig.root,
      args.config ?? args.webpackConfig,
      args.bundler
    );

  const detectedPlatforms = Object.keys(cliConfig.platforms);

  if (args.platform && !detectedPlatforms.includes(args.platform)) {
    throw new CLIError(`Unrecognized platform: ${args.platform}`);
  }

  const platforms = args.platform ? [args.platform] : detectedPlatforms;

  const configs = await makeCompilerConfig<Record<string, any>>({
    args: args,
    bundler,
    command: 'start',
    rootDir: cliConfig.root,
    platforms: platforms,
    reactNativePath: cliConfig.reactNativePath,
  });

  // expose selected args as environment variables
  setupEnvironment(args);

  if (bundler === 'rspack') {
    const maxWorkers = args.maxWorkers ?? getMaxWorkers();
    setupRspackEnvironment(maxWorkers.toString());
  }

  const isVerbose = isTruthyEnv(process.env[VERBOSE_ENV_KEY]);
  const devServerOptions = configs[0].devServer ?? {};
  const showHttpRequests = isVerbose || args.logRequests;

  // dynamically import dev middleware to match version of react-native
  const devMiddleware = await getDevMiddleware(cliConfig.reactNativePath);

  const reporter = composeReporters(
    [
      new ConsoleReporter({ asJson: args.json, isVerbose: isVerbose }),
      args.logFile ? new FileReporter({ filename: args.logFile }) : undefined,
    ].filter(Boolean) as Reporter[]
  );

  const bundlerLabel = bundler === 'rspack' ? 'Rspack' : 'webpack';
  process.stdout.write(logo(packageJson.version, bundlerLabel));

  if (args.resetCache) {
    if (bundler === 'rspack') {
      resetPersistentCache({
        bundler: 'rspack',
        rootDir: cliConfig.root,
        cacheConfigs: configs.map((config: any) => config.experiments?.cache),
      });
    } else {
      resetPersistentCache({
        bundler: 'webpack',
        rootDir: cliConfig.root,
        cacheConfigs: configs.map((config: any) => config.cache),
      });
    }
  }

  if (bundler === 'rspack' && process.env.RSPACK_PROFILE) {
    const { applyProfile } = await import('./rspack/profile/index.js');
    await applyProfile(
      process.env.RSPACK_PROFILE,
      process.env.RSPACK_TRACE_LAYER,
      process.env.RSPACK_TRACE_OUTPUT
    );
  }

  // Create compiler via dynamic import — both engines are optional peer dependencies
  let compiler: CompilerInterface;
  if (bundler === 'rspack') {
    const { Compiler } = await import('./rspack/Compiler.js');
    compiler = new Compiler(configs, reporter, cliConfig.root);
  } else {
    const { Compiler } = await import('./webpack/Compiler.js');
    compiler = new Compiler(
      platforms,
      args,
      reporter,
      cliConfig.root,
      cliConfig.reactNativePath
    );
  }

  const { createServer } = await import('@callstack/repack-dev-server');
  const { start: serverStart, stop } = await createServer({
    options: {
      ...devServerOptions,
      rootDir: cliConfig.root,
      logRequests: showHttpRequests,
      devMiddleware,
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
          getAsset: (url, platform, sendProgress) => {
            const { resourcePath } = parseUrl(url, platforms);
            return compiler.getSource(resourcePath, platform, sendProgress);
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

  await serverStart();
  compiler.start();

  return {
    stop: async () => {
      reporter.stop();
      await stop();
    },
  };
}
