import path from 'path';
import fastifyStatic from 'fastify-static';
import { DevServerOptions } from '../types';
import { FastifyDevServer } from './types';
import {
  DevServerLoggerOptions,
  getFastifyInstance,
} from './utils/getFastifyInstance';
import { WebSocketServer } from './ws/WebSocketServer';
import { WebSocketDebuggerHandler } from './ws/WebSocketDebuggerHandler';

export interface BaseDevServerConfig extends DevServerOptions {}

export class BaseDevServer {
  fastify: FastifyDevServer;
  wsServer: WebSocketServer;

  constructor(
    protected config: BaseDevServerConfig,
    loggerOptions?: DevServerLoggerOptions
  ) {
    this.fastify = getFastifyInstance(this.config, loggerOptions);
    // @ts-ignore
    this.wsServer = new WebSocketServer({ server: this.fastify.server });

    this.fastify.register(fastifyStatic, {
      root: path.join(__dirname, '../client'),
      prefix: '/debugger-ui/',
    });
  }

  async setup() {
    this.fastify.get('/', async () => {
      return { status: 'ok' };
    });

    this.fastify.get('/status', async () => 'packager-status:running');

    // Silence this route
    this.fastify.get(
      '/message',
      { logLevel: 'silent' as any },
      (_request, reply) => {
        reply.code(404).send();
      }
    );

    // Silence this route
    this.fastify.get(
      '/inspector/device',
      { logLevel: 'silent' as any },
      (_request, reply) => {
        reply.code(404).send();
      }
    );

    this.wsServer.route('/debugger-proxy', new WebSocketDebuggerHandler());
  }

  async run() {
    await this.fastify.listen({
      port: this.config.port,
      host: this.config.host,
    });
  }
}
