import WebSocket from 'ws';
import { FastifyDevServer } from '../types';
import { WebSocketServer } from './WebSocketServer';

/**
 * TODO
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
  constructor(fastify: FastifyDevServer) {
    super(fastify, '/api/dashboard');
  }

  send(message: string) {
    for (const [, socket] of this.clients.entries()) {
      try {
        socket.send(message);
      } catch (error) {
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
