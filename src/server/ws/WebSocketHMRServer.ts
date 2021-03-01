import WebSocket from 'ws';
import webpack from 'webpack';
import { FastifyDevServer } from '../types';
import { HMRMessage, HMRMessageBody } from '../../types';
import { WebSocketServer } from './WebSocketServer';

export interface WebSocketHMRServerConfig {
  /**
   * Instance of Webpack compiler.
   */
  compiler: webpack.Compiler;
}

/**
 * Class for creating a WebSocket server for Hot Module Replacement.
 *
 */
export class WebSocketHMRServer extends WebSocketServer {
  private latestStats?: webpack.Stats;
  private clients: WebSocket[] = [];

  /**
   * Create new instance of WebSocketHMRServer and attach it to the given Fastify instance.
   * Any logging information, will be passed through standard `fastify.log` API.
   *
   * @param fastify Fastify instance to attach the WebSocket server to.
   */
  constructor(
    fastify: FastifyDevServer,
    private config: WebSocketHMRServerConfig
  ) {
    super(fastify, '/__hmr');

    const { compiler } = this.config;

    compiler.hooks.invalid.tap('WebSocketHMRServer', () => {
      this.sendAction('building');
    });

    compiler.hooks.done.tap('WebSocketHMRServer', (stats) => {
      this.latestStats = stats;
      this.sendAction('built');
    });
  }

  /**
   * Send action to all connected HMR clients.
   *
   * @param action Action to send to the clients.
   */
  sendAction(action: HMRMessage['action']) {
    if (!this.clients.length) {
      return;
    }

    let body: HMRMessageBody | null = null;
    if (action !== 'building') {
      const stats = this.latestStats?.toJson({
        all: false,
        cached: true,
        children: true,
        modules: true,
        timings: true,
        hash: true,
      });

      if (!stats) {
        this.fastify.log.warn({
          msg: 'Cannot send action to client since stats are missing',
          action,
          hasStats: Boolean(this.latestStats),
        });
        return;
      }

      const modules: Record<string, string> = {};
      for (const module of stats.modules ?? []) {
        const { identifier, name } = module;
        if (identifier !== undefined && name) {
          modules[identifier] = name;
        }
      }

      body = {
        name: stats.name ?? '',
        time: stats.time ?? 0,
        hash: stats.hash ?? '',
        warnings: stats.warnings || [],
        errors: stats.errors || [],
        modules,
      };
    }

    const event = JSON.stringify({
      action,
      body,
    });

    try {
      for (const socket of this.clients) {
        socket.send(event);
      }
    } catch (error) {
      this.fastify.log.error({
        msg: 'Cannot send action to client',
        action,
        error,
      });
    }
  }

  /**
   * Process new WebSocket connection from HMR client.
   *
   * @param socket Incoming HMR client's WebSocket connection.
   */
  onConnection(socket: WebSocket) {
    this.fastify.log.info({ msg: 'HMR client connected' });
    this.clients.push(socket);

    const onClose = () => {
      this.fastify.log.info({ msg: 'HMR client disconnected' });
      const index = this.clients.indexOf(socket);
      if (index >= 0) {
        this.clients.splice(index, 1);
      } else {
        this.fastify.log.warn({
          msg: 'Cannot find client to disconnect',
          clientsLength: this.clients.length,
        });
      }
    };

    socket.addEventListener('error', onClose);
    socket.addEventListener('close', onClose);

    this.sendAction('sync');
  }
}
