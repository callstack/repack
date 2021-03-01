import { IncomingMessage } from 'http';
import { Socket } from 'net';
import { URL } from 'url';
import WebSocket from 'ws';
import { FastifyDevServer } from '../types';

/**
 * Abstract class for providing common logic (eg routing) for all WebSocket servers.
 */
export abstract class WebSocketServer {
  /**
   * An instance of the underlying WebSocket server.
   */
  protected server: WebSocket.Server;

  /**
   * Create a new instance of the WebSocketServer.
   * Any logging information, will be passed through standard `fastify.log` API.
   *
   * @param fastify Fastify instance to which the WebSocket will be attached to.
   * @param path Path on which this WebSocketServer will be accepting connections.
   * @param wssOptions WebSocket Server options.
   */
  constructor(
    protected fastify: FastifyDevServer,
    path: string,
    wssOptions: Omit<
      WebSocket.ServerOptions,
      'noServer' | 'server' | 'host' | 'port' | 'path'
    > = {}
  ) {
    this.server = new WebSocket.Server({
      noServer: true,
      ...wssOptions,
    });
    this.server.on('connection', this.onConnection.bind(this));

    const onUpgrade = (
      request: IncomingMessage,
      socket: Socket,
      head: Buffer
    ) => {
      const { pathname } = new URL(request.url || '', 'http://localhost');

      if (pathname === path) {
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
