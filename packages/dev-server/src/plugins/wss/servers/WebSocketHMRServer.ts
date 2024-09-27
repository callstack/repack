import type { IncomingMessage } from 'node:http';
import { URL } from 'node:url';
import type { FastifyInstance } from 'fastify';
import type WebSocket from 'ws';
import { WebSocketServer } from '../WebSocketServer';
import type { HmrDelegate } from '../types';

/**
 * Class for creating a WebSocket server for Hot Module Replacement.
 *
 * @category Development server
 */
export class WebSocketHMRServer extends WebSocketServer {
  private clients = new Map<
    { clientId: string; platform: string },
    WebSocket
  >();
  private nextClientId = 0;

  /**
   * Create new instance of WebSocketHMRServer and attach it to the given Fastify instance.
   * Any logging information, will be passed through standard `fastify.log` API.
   *
   * @param fastify Fastify instance to attach the WebSocket server to.
   * @param delegate HMR delegate instance.
   */
  constructor(
    fastify: FastifyInstance,
    private delegate: HmrDelegate
  ) {
    super(fastify, delegate.getUriPath());
  }

  /**
   * Send action to all connected HMR clients.
   *
   * @param event Event to send to the clients.
   * @param platform Platform of clients to send the event to.
   * @param clientIds Ids of clients who should receive the event.
   */
  send(event: any, platform: string, clientIds?: string[]) {
    const data = typeof event === 'string' ? event : JSON.stringify(event);

    for (const [key, socket] of this.clients) {
      if (
        key.platform !== platform ||
        !(clientIds ?? [key.clientId]).includes(key.clientId)
      ) {
        continue;
      }

      try {
        socket.send(data);
      } catch (error) {
        this.fastify.log.error({
          msg: 'Cannot send action to client',
          event,
          error,
          ...key,
        });
      }
    }
  }

  /**
   * Process new WebSocket connection from HMR client.
   *
   * @param socket Incoming HMR client's WebSocket connection.
   */
  onConnection(socket: WebSocket, request: IncomingMessage) {
    const { searchParams } = new URL(request.url || '', 'http://localhost');
    const platform = searchParams.get('platform');

    if (!platform) {
      this.fastify.log.debug({
        msg: 'HMR connection disconnected - missing platform',
      });
      socket.close();
      return;
    }

    const clientId = `client#${this.nextClientId++}`;

    const client = {
      clientId,
      platform,
    };

    this.clients.set(client, socket);

    this.fastify.log.debug({ msg: 'HMR client connected', ...client });

    const onClose = () => {
      this.fastify.log.debug({
        msg: 'HMR client disconnected',
        ...client,
      });
      this.clients.delete(client);
    };

    socket.addEventListener('error', onClose);
    socket.addEventListener('close', onClose);

    this.delegate.onClientConnected(platform, clientId);
  }
}
