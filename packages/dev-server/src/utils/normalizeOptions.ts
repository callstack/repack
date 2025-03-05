import type { ServerOptions as HttpsServerOptions } from 'node:https';
import type { Options as ProxyOptions } from 'http-proxy-middleware';
import type { DevServerOptions, Server } from '../types.js';

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

function normalizeProxyOptions(proxyOptions: DevServerOptions['proxy']) {
  if (proxyOptions) {
    return proxyOptions.map((options) => {
      const { context, path, pathFilter, ...rest } = options;
      return { ...rest, pathFilter: pathFilter ?? context ?? path };
    });
  }
  return undefined;
}

export interface NormalizedOptions {
  host: string;
  port: number;
  https: HttpsServerOptions | undefined;
  hot: boolean;
  proxy: ProxyOptions[] | undefined;
  url: string;
  disableRequestLogging: boolean;
  rootDir: string;
}

export function normalizeOptions(options: Server.Options): NormalizedOptions {
  const host = options.host ?? 'localhost';
  const port = options.port ?? 8081;
  const https = normalizeHttpsOptions(options.server);
  const hot = options.hot ?? false;
  const proxy = normalizeProxyOptions(options.proxy);

  const protocol = https ? 'https' : 'http';
  const url = `${protocol}://${host}:${options.port}`;

  return {
    // webpack dev server compatible options
    host,
    port,
    https,
    hot,
    proxy,
    url,
    // fastify options
    disableRequestLogging: !options.logRequests,
    // project options
    rootDir: options.rootDir,
  };
}
