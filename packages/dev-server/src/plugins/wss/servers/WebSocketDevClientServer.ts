import type { IncomingMessage } from 'node:http';
import type { FastifyInstance } from 'fastify';
import type WebSocket from 'ws';
import { WebSocketServer } from '../WebSocketServer.js';

/**
 * Class for creating a WebSocket server for communication with React Native clients.
 * All client logs - logs from React Native application - are processed here.
 *
 * @category Development server
 */
export class WebSocketDevClientServer extends WebSocketServer {
  /**
   * Create new instance of WebSocketDevClientServer and attach it to the given Fastify instance.
   * Any logging information, will be passed through standard `fastify.log` API.
   *
   * @param fastify Fastify instance to attach the WebSocket server to.
   */
  constructor(fastify: FastifyInstance) {
    super(fastify, { name: 'React Native', path: '/__client' });
  }

  /**
   * Process client message.
   *
   * @param message Stringified client message.
   */
  processMessage(message: string) {
    const { type, ...body } = JSON.parse(message);
    switch (type) {
      case 'client-log':
        if (body.level === 'error') {
          this.fastify.log.error({ issuer: 'Console', msg: body.data });
        } else if (body.level === 'warn') {
          this.fastify.log.warn({ issuer: 'Console', msg: body.data });
        } else if (body.level === 'info' || body.level === 'log') {
          this.fastify.log.info({ issuer: 'Console', msg: body.data });
        } else {
          // body.level === 'debug' || body.level === 'trace'
          this.fastify.log.debug({ issuer: 'Console', msg: body.data });
        }
        break;
      default:
        this.fastify.log.warn({ msg: 'Unknown client message', message });
    }
  }

  override onConnection(socket: WebSocket, request: IncomingMessage): string {
    const clientId = super.onConnection(socket, request);

    socket.addEventListener('message', (event) => {
      this.processMessage(event.data.toString());
    });

    return clientId;
  }
}
