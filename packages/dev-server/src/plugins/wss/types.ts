import type { IncomingMessage } from 'node:http';
import type { Socket } from 'node:net';
import type { ServerOptions } from 'ws';

export interface WebSocketServerInterface {
  shouldUpgrade(pathname: string): boolean;
  upgrade(request: IncomingMessage, socket: Socket, head: Buffer): void;
}

export type WebSocketServerOptions = {
  name: string;
  path: string | string[];
  wss?: Omit<ServerOptions, 'noServer' | 'server' | 'host' | 'port' | 'path'>;
};
