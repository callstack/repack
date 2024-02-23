import { IncomingMessage } from 'http';
import type { FastifyInstance } from 'fastify';
import { WebSocket, WebSocketServer as WebSocketServerImpl } from 'ws';
import { WebSocketServer } from '../WebSocketServer';

export class DevMiddlewareServer extends WebSocketServer {
  constructor(
    fastify: FastifyInstance,
    private path: string,
    private wssServer: WebSocketServerImpl
  ) {
    super(fastify, path, {}, wssServer);
  }

  onConnection(_socket: WebSocket, _request: IncomingMessage) {
    // no-op
  }
}
