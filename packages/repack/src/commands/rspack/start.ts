import type { Configuration, MultiRspackOptions } from '@rspack/core';
import packageJson from '../../../package.json';
import { VERBOSE_ENV_KEY } from '../../env.js';
import { CLIError, isRspack2, isTruthyEnv } from '../../helpers/index.js';
import {
  ConsoleReporter,
  FileReporter,
  type Reporter,
  composeReporters,
  makeLogEntryFromFastifyLog,
} from '../../logging/index.js';
import { makeCompilerConfig } from '../common/config/makeCompilerConfig.js';
import {
  getDevMiddleware,
  getMaxWorkers,
  getMimeType,
  getRspackCacheConfigs,
  parseUrl,
  resetPersistentCache,
  resolveProjectPath,
  runAdbReverse,
  setupEnvironment,
  setupInteractions,
  setupRspackEnvironment,
  warnLegacyRspackCacheConfig,
} from '../common/index.js';
import logo from '../common/logo.js';
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

  // Rspack 2 silently ignores the legacy `experiments.cache` option -
  // warn the user so they migrate it to the top-level `cache` option
  if (isRspack2(cliConfig.root)) {
    warnLegacyRspackCacheConfig(configs);
  }

  // expose selected args as environment variables
  setupEnvironment(args);

  const maxWorkers = args.maxWorkers ?? getMaxWorkers();
  setupRspackEnvironment(maxWorkers.toString());

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

  process.stdout.write(logo(packageJson.version, 'Rspack'));

  if (args.resetCache) {
    resetPersistentCache({
      bundler: 'rspack',
      rootDir: cliConfig.root,
      cacheConfigs: configs.flatMap(getRspackCacheConfigs),
    });
  }

  if (process.env.RSPACK_PROFILE) {
    const { applyProfile } = await import('./profile/index.js');
    await applyProfile(
      process.env.RSPACK_PROFILE,
      process.env.RSPACK_TRACE_LAYER,
      process.env.RSPACK_TRACE_OUTPUT
    );
  }

  // CAST - no clean solution available here:
  // Re.Pack augments `Configuration.devServer` with its own dev server options
  // (src/types/dev-server-options.d.ts), while Rspack 2 types `devServer` with
  // its bundled `DevServer` type. The two are structurally incompatible solely
  // because each pulls `proxy` types from a different copy of
  // http-proxy-middleware, so no narrowing or `satisfies` can bridge them.
  // Unlike `bundle`, `devServer` cannot be stripped from the config here -
  // the dev server flow reads it back from `compiler.options`. At runtime
  // Rspack accepts & preserves the key (validation is permissive, verified
  // in agent_context/rspackv2-jul2026/07-verification-results.md).
  const compiler = new Compiler(
    configs as unknown as MultiRspackOptions,
    reporter,
    cliConfig.root
  );

  const { createServer } = await import('@callstack/repack-dev-server');
  const { start, stop } = await createServer({
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

  await start();
  compiler.start();

  return {
    stop: async () => {
      reporter.stop();
      await stop();
    },
  };
}
