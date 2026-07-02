import type { Configuration } from '@rspack/core';
import packageJson from '../../../package.json';
import { VERBOSE_ENV_KEY } from '../../env.js';
import { CLIError, isTruthyEnv } from '../../helpers/index.js';
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
  parseUrl,
  resetPersistentCache,
  resolveProjectPath,
  runAdbReverse,
  setupEnvironment,
  setupInteractions,
  setupRspackEnvironment,
} from '../common/index.js';
import logo from '../common/logo.js';
import type { CliConfig, StartArguments } from '../types.js';
import { Compiler } from './Compiler.js';

function isDigits(value: string): boolean {
  for (const character of value) {
    if (character < '0' || character > '9') {
      return false;
    }
  }

  return value.length > 0;
}

function isHostPortPath(value: string): boolean {
  const pathStart = value.indexOf('/');
  if (pathStart === -1) {
    return false;
  }

  const authority = value.slice(0, pathStart);
  const portStart = authority.lastIndexOf(':');
  if (portStart <= 0) {
    return false;
  }

  const hostname = authority.slice(0, portStart);
  const port = authority.slice(portStart + 1);
  return (
    !hostname.includes(':') &&
    (hostname === 'localhost' || hostname.includes('.')) &&
    isDigits(port)
  );
}

function getFetchableSourceMapUrl(url: string): URL | undefined {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    if (isHostPortPath(url)) {
      parsedUrl = new URL(`http://${url}`);
    } else if (url.startsWith('//')) {
      parsedUrl = new URL(`http:${url}`);
    } else {
      return undefined;
    }
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return undefined;
  }

  if (!parsedUrl.pathname.endsWith('.map')) {
    parsedUrl.pathname = `${parsedUrl.pathname}.map`;
  }

  return parsedUrl;
}

function getRemoteNameFromBundleUrl(url: string): string | undefined {
  const filename = url.split(/[?#]/)[0].split('/').pop() ?? '';

  return (
    filename.match(/\.([^.]+)\.chunk\.bundle(?:\.map)?$/)?.[1] ??
    filename.match(/^([^/.]+)\.container\.js\.bundle(?:\.map)?$/)?.[1]
  );
}

function getSourceMapUrlsFromRemoteConfig(
  url: string,
  configs: Configuration[]
): URL[] {
  const remoteName = getRemoteNameFromBundleUrl(url);
  const filename = url.split(/[?#]/)[0].split('/').pop();
  if (!filename) {
    return [];
  }

  const sourceMapFilename = filename.endsWith('.map')
    ? filename
    : `${filename}.map`;

  return configs
    .flatMap((config) => config.plugins ?? [])
    .flatMap((plugin) => {
      const remotes =
        (plugin as { config?: { remotes?: Record<string, unknown> } })?.config
          ?.remotes ?? {};
      const remoteSpecs = remoteName
        ? [remotes[remoteName]]
        : Object.values(remotes);
      const remoteValues = remoteSpecs.flatMap((remoteSpec) =>
        Array.isArray(remoteSpec) ? remoteSpec : [remoteSpec]
      );

      return remoteValues.flatMap((value) => {
        if (typeof value !== 'string') {
          return [];
        }

        const remoteUrl = getFetchableSourceMapUrl(
          value.includes('@') ? value.slice(value.indexOf('@') + 1) : value
        );
        if (!remoteUrl) {
          return [];
        }

        remoteUrl.pathname = `${remoteUrl.pathname.replace(
          /\/[^/]*$/,
          ''
        )}/${sourceMapFilename}`;
        return [remoteUrl];
      });
    });
}

async function fetchSourceMapFromBundleServer(
  url: string,
  configs: Configuration[]
): Promise<Buffer | undefined> {
  const sourceMapUrls = [
    getFetchableSourceMapUrl(url),
    ...getSourceMapUrlsFromRemoteConfig(url, configs),
  ].filter(Boolean) as URL[];

  const results = await Promise.allSettled(
    sourceMapUrls.map(async (sourceMapUrl) => {
      const response = await fetch(sourceMapUrl, {
        signal: AbortSignal.timeout(2000),
      });
      if (response.ok) {
        return Buffer.from(await response.arrayBuffer());
      }
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      return result.value;
    }
  }
}

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
      cacheConfigs: configs.map((config) => config.experiments?.cache),
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

  const compiler = new Compiler(configs, reporter, cliConfig.root);

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
            return compiler
              .getSourceMap(resourcePath, platform)
              .catch(async (error) => {
                try {
                  const sourceMap = await fetchSourceMapFromBundleServer(
                    url,
                    configs
                  );
                  if (sourceMap) {
                    return sourceMap;
                  }
                } catch {
                  // Preserve the original compiler error below.
                }

                throw error;
              });
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
