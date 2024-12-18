import type { IncomingMessage } from 'node:http';
import type { Socket } from 'node:net';
import type { FastifyInstance } from 'fastify';
import type { WebSocketServer } from 'ws';
import type { WebSocketServerInterface } from './types.ts';

export class WebSocketServerAdapter implements WebSocketServerInterface {
  constructor(
    private fastify: FastifyInstance,
    private path: string,
    private server?: WebSocketServer
  ) {}

  shouldUpgrade(pathname: string) {
    if (!this.server) {
      this.fastify.log.warn({ msg: `No handler active for ${this.path}` });
      return false;
    }
    return this.path === pathname;
  }

  upgrade(request: IncomingMessage, socket: Socket, head: Buffer) {
    this.server?.handleUpgrade(request, socket, head, (webSocket) => {
      this.server?.emit('connection', webSocket, request);
    });
  }
}
