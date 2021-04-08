import { IncomingMessage } from 'http';
import { Socket } from 'net';
import { URL } from 'url';
import WebSocket from 'ws';
import { FastifyDevServer } from '../types';

/**
 * Abstract class for providing common logic (eg routing) for all WebSocket servers.
 *
 * @category Development server
 */
export abstract class WebSocketServer {
  /** An instance of the underlying WebSocket server. */
  protected server: WebSocket.Server;

  /** Fastify instance from which {@link server} will receive upgrade connections. */
  protected fastify: FastifyDevServer;

  /**
   * Create a new instance of the WebSocketServer.
   * Any logging information, will be passed through standard `fastify.log` API.
   *
   * @param fastify Fastify instance to which the WebSocket will be attached to.
   * @param path Path on which this WebSocketServer will be accepting connections.
   * @param wssOptions WebSocket Server options.
   */
  constructor(
    fastify: FastifyDevServer,
    path: string | string[],
    wssOptions: Omit<
      WebSocket.ServerOptions,
      'noServer' | 'server' | 'host' | 'port' | 'path'
    > = {}
  ) {
    this.fastify = fastify;
    this.server = new WebSocket.Server({
      noServer: true,
      ...wssOptions,
    });
    this.server.on('connection', this.onConnection.bind(this));

    const allowedPaths = Array.isArray(path) ? path : [path];

    const onUpgrade = (
      request: IncomingMessage,
      socket: Socket,
      head: Buffer
    ) => {
      const { pathname } = new URL(request.url || '', 'http://localhost');

      if (allowedPaths.includes(pathname)) {
        this.server.handleUpgrade(request, socket, head, (webSocket) => {
          this.server.emit('connection', webSocket, request);
        });
      }

      if (isLastListener) {
        this.fastify.log.debug({
          msg: 'Destroying socket connection as no was path matched',
          pathname,
        });
        socket.destroy();
      }
    };

    const isLastListener =
      this.fastify.server.listeners('upgrade').reverse()[0] === onUpgrade;
    this.fastify.server.on('upgrade', onUpgrade);
  }

  /**
   * Process incoming WebSocket connection.
   *
   * @param socket Incoming WebSocket connection.
   * @param request Upgrade request for the connection.
   */
  abstract onConnection(socket: WebSocket, request: IncomingMessage): void;
}
