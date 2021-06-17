import Fastify from 'fastify';
import { DevServerOptions } from '../../types';
import { DevServerLoggerOptions, FastifyDevServer } from '../types';

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
