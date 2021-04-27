import { IncomingMessage } from 'http';
import { Socket } from 'net';
import { FastifyDevServer } from '../types';
import { WebSocketServer } from './WebSocketServer';

/**
 * TODO
 *
 * @category Development server
 */
export class WebSocketRouter {
  /** TODO */
  protected servers: WebSocketServer[] = [];

  /**
   * TODO
   *
   * @param fastify
   * @param options
   */
  constructor(private fastify: FastifyDevServer) {
    this.fastify.server.on(
      'upgrade',
      (request: IncomingMessage, socket: Socket, head: Buffer) => {
        const { pathname } = new URL(request.url || '', 'http://localhost');
        let matched = false;
        for (const server of this.servers) {
          if (server.shouldUpgrade(pathname)) {
            matched = true;
            server.upgrade(request, socket, head);
            break;
          }
        }

        if (!matched) {
          this.fastify.log.debug({
            msg: 'Destroying socket connection as no server was matched',
            pathname,
          });
          socket.destroy();
        }
      }
    );
  }

  /**
   * TODO
   *
   * @param server
   */
  registerServer<T extends WebSocketServer>(server: T): T {
    this.servers.push(server);
    return server;
  }
}
