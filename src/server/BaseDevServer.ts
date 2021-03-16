import path from 'path';
import fastifyStatic from 'fastify-static';
import open from 'open';
import openEditor from 'open-editor';
import { DevServerOptions } from '../types';
import { DevServerLoggerOptions, FastifyDevServer } from './types';
import { getFastifyInstance } from './utils/getFastifyInstance';
import {
  WebSocketDebuggerServer,
  WebSocketMessageServer,
  WebSocketEventsServer,
  WebSocketDevClientServer,
} from './ws';

/**
 * {@link BaseDevServer} configuration options.
 */
export interface BaseDevServerConfig extends DevServerOptions {}

/**
 * Base class for all Fastify-based servers.
 * It handles creation of a Fastify instance, creation of all WebSocket servers and running Fastify.
 *
 * @category Development server
 */
export class BaseDevServer {
  /** Configuration options. */
  protected config: BaseDevServerConfig;

  /** Fastify instance. */
  fastify: FastifyDevServer;
  /** Debugger server instance. */
  wsDebuggerServer: WebSocketDebuggerServer;
  /** Message server instance. */
  wsMessageServer: WebSocketMessageServer;
  /** Events server instance. */
  wsEventsServer: WebSocketEventsServer;
  /** Server instance for React Native clients. */
  wsClientServer: WebSocketDevClientServer;

  /**
   * Constructs new `BaseDevServer` instance.
   *
   * @param config Configuration options.
   * @param loggerOptions Logger options.
   */
  constructor(
    config: BaseDevServerConfig,
    loggerOptions?: DevServerLoggerOptions
  ) {
    this.config = config;
    this.fastify = getFastifyInstance(this.config, loggerOptions);

    this.wsDebuggerServer = new WebSocketDebuggerServer(this.fastify);
    this.wsMessageServer = new WebSocketMessageServer(this.fastify);
    this.wsEventsServer = new WebSocketEventsServer(this.fastify, {
      webSocketMessageServer: this.wsMessageServer,
    });
    this.wsClientServer = new WebSocketDevClientServer(this.fastify);

    this.fastify.register(fastifyStatic, {
      root: path.join(__dirname, '../client'),
      prefix: '/debugger-ui',
      prefixAvoidTrailingSlash: true,
    });

    this.fastify.addHook('onSend', async (_request, reply, payload) => {
      reply.header('X-Content-Type-Options', 'nosniff');
      return payload;
    });
  }

  /**
   * Sets up common routes.
   *
   * All classes that implements {@link BaseDevServer} should call this method before
   * calling {@link run}.
   */
  async setup() {
    this.fastify.get('/', async () => {
      return 'React Native packager is running';
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

    this.fastify.route({
      method: ['GET', 'POST', 'PUT'],
      url: '/launch-js-devtools',
      handler: async (request, reply) => {
        const customDebugger = process.env.REACT_DEBUGGER;
        if (customDebugger) {
          // NOOP for now
        } else if (!this.wsDebuggerServer.isDebuggerConnected()) {
          const url = `${this.config.https ? 'https' : 'http'}://${
            this.config.host || 'localhost'
          }:${this.config.port}/debugger-ui`;
          try {
            this.fastify.log.info({ msg: 'Opening debugger UI', url });
            await open(url);
          } catch (error) {
            if (error) {
              this.fastify.log.error({
                msg: 'Cannot open debugger UI',
                url,
                error,
              });
            }
          }
        }
        reply.send('OK');
      },
    });

    this.fastify.route({
      method: ['GET', 'POST', 'PUT'],
      url: '/open-stack-frame',
      handler: async (request, reply) => {
        try {
          const { file, lineNumber, column } = JSON.parse(
            request.body as string
          ) as {
            file: string;
            lineNumber: number;
            column?: number;
          };
          const url = `${path.join(
            this.config.context,
            file.replace('webpack://', '')
          )}:${lineNumber}:${column ?? 1}`;

          this.fastify.log.info({ msg: 'Opening stack frame in editor', url });
          openEditor([url]);
          reply.send('OK');
        } catch (error) {
          this.fastify.log.error({
            msg: 'Failed to open stack frame in editor',
            error: error.message,
          });
          reply.code(400).send();
        }
      },
    });

    this.fastify.route({
      method: ['GET', 'POST', 'PUT'],
      url: '/open-url',
      handler: async (request, reply) => {
        try {
          const { url } = JSON.parse(request.body as string) as { url: string };
          this.fastify.log.info({ msg: 'Opening URL', url });
          await open(url);
          reply.send('OK');
        } catch (error) {
          this.fastify.log.error({ msg: 'Failed to open URL', error });
          reply.code(400).send();
        }
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

  /**
   * Runs Fastify and listens on port and host specified in constructor.
   */
  async run() {
    await this.fastify.listen({
      port: this.config.port,
      host: this.config.host,
    });
  }
}
