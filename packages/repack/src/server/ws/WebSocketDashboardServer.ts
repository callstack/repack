import WebSocket from 'ws';
import webpack from 'webpack';
import { FastifyDevServer } from '../types';
import { WebSocketServer } from './WebSocketServer';

/**
 * {@link WebSocketDashboardServer} configuration options.
 */
interface WebSocketDashboardServerConfig {
  /** Instance of Webpack compiler */
  compiler?: webpack.Compiler;
}

/**
 * Class for creating a WebSocket server for Dashboard client.
 * It's used by built-in Dashboard web-app to receive compilation
 * events, logs and other necessary messages.
 *
 * @category Development server
 */
export class WebSocketDashboardServer extends WebSocketServer {
  private clients = new Map<string, WebSocket>();
  private nextClientId = 0;

  /**
   * Create new instance of WebSocketDashboardServer and attach it to the given Fastify instance.
   * Any logging information, will be passed through standard `fastify.log` API.
   *
   * @param fastify Fastify instance to attach the WebSocket server to.
   */
  constructor(
    fastify: FastifyDevServer,
    private config?: WebSocketDashboardServerConfig
  ) {
    super(fastify, '/api/dashboard');

    if (this.config) {
      this.config.compiler?.hooks.invalid.tap(
        'WebSocketDashboardServer',
        () => {
          this.send(
            JSON.stringify({
              kind: 'compilation',
              event: { name: 'invalid' },
            })
          );
        }
      );

      this.config.compiler?.hooks.done.tap('WebSocketDashboardServer', () => {
        this.send(
          JSON.stringify({
            kind: 'compilation',
            event: {
              name: 'done',
            },
          })
        );
      });
    }
  }

  /**
   * Send message to all connected Dashboard clients.
   *
   * @param message Stringified message to sent.
   */
  send(message: string) {
    for (const [, socket] of this.clients.entries()) {
      try {
        socket.send(message);
      } catch {
        // NOOP
      }
    }
  }

  /**
   * Process new WebSocket connection from client application.
   *
   * @param socket Incoming client's WebSocket connection.
   */
  onConnection(socket: WebSocket) {
    const clientId = `client#${this.nextClientId++}`;
    this.clients.set(clientId, socket);

    this.fastify.log.info({ msg: 'Dashboard client connected', clientId });
    this.clients.set(clientId, socket);

    const onClose = () => {
      this.fastify.log.info({
        msg: 'Dashboard client disconnected',
        clientId,
      });
      this.clients.delete(clientId);
    };

    socket.addEventListener('error', onClose);
    socket.addEventListener('close', onClose);
  }
}
