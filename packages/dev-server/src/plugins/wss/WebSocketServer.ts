import type { IncomingMessage } from 'node:http';
import type { Socket } from 'node:net';
import type { FastifyInstance } from 'fastify';
import { type WebSocket, WebSocketServer as WebSocketServerImpl } from 'ws';
import type {
  WebSocketServerInterface,
  WebSocketServerOptions,
} from './types.js';

/**
 * Abstract class for providing common logic (eg routing) for all WebSocket servers.
 *
 * @category Development server
 */
export abstract class WebSocketServer<T extends WebSocket = WebSocket>
  implements WebSocketServerInterface
{
  /** An instance of the underlying WebSocket server. */
  protected server: WebSocketServerImpl;

  /** Fastify instance from which {@link server} will receive upgrade connections. */
  protected fastify: FastifyInstance;

  protected name: string;

  protected paths: string[];

  protected clients: Map<string, T>;
  protected nextClientId = 0;

  /**
   * Create a new instance of the WebSocketServer.
   * Any logging information, will be passed through standard `fastify.log` API.
   *
   * @param fastify Fastify instance to which the WebSocket will be attached to.
   * @param path Path on which this WebSocketServer will be accepting connections.
   * @param options WebSocketServer options.
   */
  constructor(fastify: FastifyInstance, options: WebSocketServerOptions) {
    this.fastify = fastify;

    this.name = options.name;

    this.server = new WebSocketServerImpl({ noServer: true, ...options.wss });
    this.server.on('connection', this.onConnection.bind(this));

    this.paths = Array.isArray(options.path) ? options.path : [options.path];

    this.clients = new Map();
  }

  shouldUpgrade(pathname: string) {
    return this.paths.includes(pathname);
  }

  upgrade(request: IncomingMessage, socket: Socket, head: Buffer) {
    this.server.handleUpgrade(request, socket, head, (webSocket) => {
      this.server.emit('connection', webSocket, request);
    });
  }

  onConnection(socket: T, _request: IncomingMessage): string {
    const clientId = `client#${this.nextClientId++}`;
    this.clients.set(clientId, socket);
    this.fastify.log.debug({ msg: 'API client connected', clientId });

    const errorHandler = () => {
      this.fastify.log.debug({ msg: 'API client disconnected', clientId });
      socket.removeAllListeners(); // should we do this?
      this.clients.delete(clientId);
    };

    socket.addEventListener('error', errorHandler);
    socket.addEventListener('close', errorHandler);

    return clientId;
  }
}
