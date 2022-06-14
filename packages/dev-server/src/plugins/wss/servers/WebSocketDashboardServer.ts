import { FastifyInstance } from 'fastify';
import WebSocket from 'ws';
import { WebSocketServer } from '../WebSocketServer';

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
   * @param emitter Event emitter instance.
   */
  constructor(fastify: FastifyInstance) {
    super(fastify, '/api/dashboard');
  }

  /**
   * Send message to all connected Dashboard clients.
   *
   * @param event Event string or object to send.
   */
  send(event: any) {
    const data = typeof event === 'string' ? event : JSON.stringify(event);

    for (const [, socket] of this.clients.entries()) {
      try {
        socket.send(data);
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
