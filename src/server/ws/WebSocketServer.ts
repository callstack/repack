import { IncomingMessage, Server } from 'http';
import { Socket } from 'net';
import { URL } from 'url';
import WebSocket from 'ws';
import { FastifyDevServer } from '../types';

export abstract class WebSocketServer {
  protected server: WebSocket.Server;

  constructor(devServer: FastifyDevServer, path: string) {
    this.server = new WebSocket.Server({
      noServer: true,
    });
    this.server.on('connection', this.onConnection.bind(this));

    const onUpgrade = (
      request: IncomingMessage,
      socket: Socket,
      head: Buffer
    ) => {
      const { pathname } = new URL(request.url || '', 'http://localhost');
      console.log({ pathname, path });
      if (pathname === path) {
        this.server.handleUpgrade(request, socket, head, (webSocket) => {
          this.server.emit('connection', webSocket, request);
        });
      }

      if (isLastListener) {
        socket.destroy();
      }
    };

    const isLastListener =
      devServer.server.listeners('upgrade').reverse()[0] === onUpgrade;
    devServer.server.on('upgrade', onUpgrade);
  }

  abstract onConnection(socket: WebSocket, request: IncomingMessage): void;
}
