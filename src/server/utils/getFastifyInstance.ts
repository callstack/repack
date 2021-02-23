import { Writable } from 'stream';
import Fastify, { FastifyLoggerOptions } from 'fastify';
import { DevServerOptions } from '../../types';
import { FastifyDevServer } from '../types';

export interface DevServerLoggerOptions extends FastifyLoggerOptions {
  stream?: Writable;
}

export function getFastifyInstance(
  config: DevServerOptions,
  logger?: DevServerLoggerOptions
): FastifyDevServer {
  if (config.https && config.cert && config.key) {
    // @ts-ignore
    return Fastify({
      logger,
      https: { cert: config.cert, key: config.key },
    });
  } else {
    // @ts-ignore
    return Fastify({
      logger,
    });
  }
}
