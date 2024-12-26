import type { FastifyInstance } from 'fastify';
import { WebSocketServer } from '../WebSocketServer.js';

/**
 * Class for creating a WebSocket server for Hot Module Replacement.
 *
 * @category Development server
 */
export class WebSocketHMRServer extends WebSocketServer {
  /**
   * Create new instance of WebSocketHMRServer and attach it to the given Fastify instance.
   * Any logging information, will be passed through standard `fastify.log` API.
   *
   * @param fastify Fastify instance to attach the WebSocket server to.
   * @param delegate HMR delegate instance.
   */
  constructor(fastify: FastifyInstance) {
    super(fastify, {
      name: 'HMR',
      path: '/__hmr',
    });
  }

  /**
   * Send action to all connected HMR clients.
   *
   * @param event Event to send to the clients.
   * @param platform Platform of clients to send the event to.
   * @param clientIds Ids of clients who should receive the event.
   */
  send(event: any) {
    const data = typeof event === 'string' ? event : JSON.stringify(event);

    this.clients.forEach((socket) => {
      try {
        socket.send(data);
      } catch (error) {
        this.fastify.log.error({
          msg: 'Cannot send action to client',
          event,
          error,
        });
      }
    });
  }
}
