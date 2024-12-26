import type { IncomingMessage } from 'node:http';
import type { Socket } from 'node:net';
import type { ServerOptions } from 'ws';

/**
 * Delegate with implementation for HMR-specific functions.
 */
export interface HmrDelegate {
  /**
   * Callback for when the new HMR client is connected.
   *
   * Useful for running initial synchronization or any other side effect.
   *
   * @param platform Platform of the connected client.
   * @param clientId Id of the connected client.
   */
  onClientConnected: (platform: string, clientId: string) => void;
}

export interface WebSocketServerInterface {
  shouldUpgrade(pathname: string): boolean;
  upgrade(request: IncomingMessage, socket: Socket, head: Buffer): void;
}

export type WebSocketServerOptions = {
  name: string;
  path: string | string[];
  wss?: Omit<ServerOptions, 'noServer' | 'server' | 'host' | 'port' | 'path'>;
};
