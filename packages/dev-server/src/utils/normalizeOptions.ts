import type { ServerOptions as HttpsServerOptions } from 'node:https';
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

export interface NormalizedOptions {
  host: string;
  port: number;
  https: HttpsServerOptions | undefined;
  hot: boolean;
  url: string;
  disableRequestLogging: boolean;
  rootDir: string;
}

export function normalizeOptions(options: Server.Options): NormalizedOptions {
  const host = options.host ?? 'localhost';
  const port = options.port ?? 8081;
  const https = normalizeHttpsOptions(options.server);
  const hot = options.hot ?? false;

  const protocol = https ? 'https' : 'http';
  const url = `${protocol}://${host}:${options.port}`;

  return {
    // webpack dev server compatible options
    host,
    port,
    https,
    hot,
    url,
    // fastify options
    disableRequestLogging: !options.logRequests,
    // project options
    rootDir: options.rootDir,
  };
}
