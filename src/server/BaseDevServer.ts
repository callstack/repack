import path from 'path';
import fastifyStatic from 'fastify-static';
import { DevServerOptions } from '../types';
import { FastifyDevServer } from './types';
import {
  DevServerLoggerOptions,
  getFastifyInstance,
} from './utils/getFastifyInstance';
import { WebSocketDebuggerServer } from './ws/WebSocketDebuggerServer';
import { WebSocketMessageServer } from './ws/WebSocketMessageServer';
import { WebSocketEventsServer } from './ws/WebSocketEventsServer';
import { WebSocketDevClientServer } from './ws/WebSocketDevClientServer';

export interface BaseDevServerConfig extends DevServerOptions {}

export class BaseDevServer {
  fastify: FastifyDevServer;
  wsDebuggerServer: WebSocketDebuggerServer;
  wsMessageServer: WebSocketMessageServer;
  wsEventsServer: WebSocketEventsServer;
  wsClientServer: WebSocketDevClientServer;

  constructor(
    protected config: BaseDevServerConfig,
    loggerOptions?: DevServerLoggerOptions
  ) {
    this.fastify = getFastifyInstance(this.config, loggerOptions);

    this.wsDebuggerServer = new WebSocketDebuggerServer(this.fastify);
    this.wsMessageServer = new WebSocketMessageServer(this.fastify);
    this.wsEventsServer = new WebSocketEventsServer(this.fastify, {
      webSocketMessageServer: this.wsMessageServer,
    });
    this.wsClientServer = new WebSocketDevClientServer(this.fastify);

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

    this.fastify.route({
      method: ['GET', 'POST', 'PUT'],
      url: '/reload',
      handler: (_request, reply) => {
        this.wsMessageServer.broadcast('reload');
        reply.send('OK');
      },
    });

    // Silence this route
    this.fastify.get(
      '/inspector/device',
      { logLevel: 'silent' as any },
      (_request, reply) => {
        reply.code(404).send();
      }
    );
  }

  async run() {
    await this.fastify.listen({
      port: this.config.port,
      host: this.config.host,
    });
  }
}
