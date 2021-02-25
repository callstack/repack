import { IncomingMessage } from 'http';
import WebSocket from 'ws';

export interface WebSocketRouteHandler {
  onConnection(socket: WebSocket, request: IncomingMessage): void;
}

export class WebSocketServer {
  server: WebSocket.Server;
  private routes: Record<string, WebSocketRouteHandler> = {};

  constructor(options: WebSocket.ServerOptions) {
    this.server = new WebSocket.Server(options);

    this.server.on('connection', (socket, request) => {
      if (request.url) {
        for (const path in this.routes) {
          if (request.url.startsWith(path)) {
            this.routes[path].onConnection(socket, request);
            return;
          }
        }
      }

      // Close socket if no handler was found for it.
      socket.close();
    });
  }

  route(path: string, handler: WebSocketRouteHandler) {
    this.routes[path] = handler;
  }
}
