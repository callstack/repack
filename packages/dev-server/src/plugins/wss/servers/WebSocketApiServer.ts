import type { FastifyInstance } from 'fastify';
import { WebSocketServer } from '../WebSocketServer.js';

/**
 * Class for creating a WebSocket server for API clients.
 * Useful to listening for compilation events and new logs.
 *
 * @category Development server
 */
export class WebSocketApiServer extends WebSocketServer {
  /**
   * Create new instance of WebSocketApiServer and attach it to the given Fastify instance.
   * Any logging information, will be passed through standard `fastify.log` API.
   *
   * @param fastify Fastify instance to attach the WebSocket server to.
   */
  constructor(fastify: FastifyInstance) {
    super(fastify, { name: 'API', path: '/api' });
  }

  /**
   * Send message to all connected API clients.
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
}
