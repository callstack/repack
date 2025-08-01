import type { ServerOptions as HttpsServerOptions } from 'node:https';
import type * as DevMiddleware from '@react-native/dev-middleware';
import type { Options as ProxyOptions } from 'http-proxy-middleware';
import type {
  DevServerOptions,
  Middleware,
  Server,
  SetupMiddlewaresFunction,
} from '../types.js';

function normalizeHttpsOptions(serverOptions: DevServerOptions['server']) {
  if (
    serverOptions &&
    typeof serverOptions === 'object' &&
    serverOptions.type === 'https'
  ) {
    return serverOptions.options;
  }
  return undefined;
}

function normalizeProxyOptions(
  proxyOptions: DevServerOptions['proxy'],
  fallbackTarget: string
) {
  if (proxyOptions) {
    return proxyOptions.map((options) => {
      const { context, path, pathFilter, target, ...rest } = options;
      return {
        ...rest,
        // webpack dev server compatible aliases for pathFilter
        pathFilter: pathFilter ?? context ?? path,
        // assume that if the target is not provided, we target our own DevServer
        target: target ?? fallbackTarget,
      };
    });
  }
  return undefined;
}

function normalizeSetupMiddlewares(
  setupMiddlewares?: DevServerOptions['setupMiddlewares']
) {
  // create a passthrough function if no setupMiddlewares is provided
  return setupMiddlewares ?? ((middlewares: Middleware[]) => middlewares);
}

export interface NormalizedOptions {
  host: string;
  port: number;
  https: HttpsServerOptions | undefined;
  hot: boolean;
  proxy: ProxyOptions[] | undefined;
  url: string;
  disableRequestLogging: boolean;
  devMiddleware: typeof DevMiddleware;
  rootDir: string;
  setupMiddlewares: SetupMiddlewaresFunction;
}

export function normalizeOptions(options: Server.Options): NormalizedOptions {
  const host = options.host ?? 'localhost';
  const port = options.port ?? 8081;
  const https = normalizeHttpsOptions(options.server);
  const hot = options.hot ?? false;

  const protocol = https ? 'https' : 'http';
  const url = `${protocol}://${host}:${options.port}`;

  const proxy = normalizeProxyOptions(options.proxy, url);
  const setupMiddlewares = normalizeSetupMiddlewares(options.setupMiddlewares);

  return {
    // webpack dev server compatible options
    host,
    port,
    https,
    hot,
    proxy,
    url,
    // dev middleware
    devMiddleware: options.devMiddleware,
    // fastify options
    disableRequestLogging: !options.logRequests,
    // project options
    rootDir: options.rootDir,
    // custom middleware setup
    setupMiddlewares,
  };
}
