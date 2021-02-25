import { IncomingMessage } from 'http';
import { URL } from 'url';
import WebSocket from 'ws';
import { FastifyDevServer } from '../types';
import { WebSocketServer } from './WebSocketServer';

interface ReactNativeIdObject {
  requestId: string;
  clientId: string;
}

interface ReactNativeMessage {
  version?: string;
  id?: ReactNativeIdObject;
  method?: string;
  target: string;
  result?: any;
  error?: Error;
  params?: Record<string, any>;
}

type WebSocketWithUpgradeReq = WebSocket & { upgradeReq?: IncomingMessage };

// TODO: better logging
/**
 * Class for creating a WebSocket server and sending messages between development server
 * and the React Native applications.
 *
 * Based on: https://github.com/react-native-community/cli/blob/v4.14.0/packages/cli-server-api/src/websocket/messageSocketServer.ts
 */
export class WebSocketMessageServer extends WebSocketServer {
  static readonly PROTOCOL_VERSION = 2;

  static isBroadcast(message: Partial<ReactNativeMessage>) {
    return (
      typeof message.method === 'string' &&
      message.id === undefined &&
      message.target === undefined
    );
  }

  static isRequest(message: Partial<ReactNativeMessage>) {
    return (
      typeof message.method === 'string' && typeof message.target === 'string'
    );
  }

  static isResponse(message: Partial<ReactNativeMessage>) {
    return (
      typeof message.id === 'object' &&
      typeof message.id.requestId !== 'undefined' &&
      typeof message.id.clientId === 'string' &&
      (message.result !== undefined || message.error !== undefined)
    );
  }

  private clients = new Map<string, WebSocketWithUpgradeReq>();
  private nextClientId = 0;

  /**
   * Create new instance of WebSocketMessageServer and attach it to the given Fastify instance.
   * Any logging information, will be passed through standard `fastify.log` API.
   *
   * @param fastify Fastify instance to attach the WebSocket server to.
   */
  constructor(fastify: FastifyDevServer) {
    super(fastify, '/message');
  }

  parseMessage(
    data: string,
    binary: any
  ): Partial<ReactNativeMessage> | undefined {
    if (binary) {
      this.fastify.log.error(
        'Failed to parse message - expected text message, got binary'
      );
      return undefined;
    }
    try {
      const message = JSON.parse(data) as Partial<ReactNativeMessage>;
      if (
        message.version === WebSocketMessageServer.PROTOCOL_VERSION.toString()
      ) {
        return message;
      }
      this.fastify.log.error('Received message had wrong protocol version', {
        message,
      });
    } catch (e) {
      this.fastify.log.error('Failed to parse the message as JSON', { data });
    }
    return undefined;
  }

  getClientSocket(clientId: string) {
    const socket = this.clients.get(clientId);
    if (socket === undefined) {
      throw new Error(`Could not find client with id "${clientId}"`);
    }
    return socket;
  }

  handleError(
    clientId: string,
    message: Partial<ReactNativeMessage>,
    error: Error
  ) {
    const errorMessage = {
      id: message.id,
      method: message.method,
      target: message.target,
      error: message.error === undefined ? 'undefined' : 'defined',
      params: message.params === undefined ? 'undefined' : 'defined',
      result: message.result === undefined ? 'undefined' : 'defined',
    };

    if (message.id === undefined) {
      this.fastify.log.error('Handling message failed', {
        clientId,
        error,
        errorMessage,
      });
    } else {
      try {
        const socket = this.getClientSocket(clientId);
        socket.send(
          JSON.stringify({
            version: WebSocketMessageServer.PROTOCOL_VERSION,
            error,
            id: message.id,
          })
        );
      } catch (error) {
        this.fastify.log.error('Failed to reply', {
          clientId,
          error,
          errorMessage,
        });
      }
    }
  }

  forwardRequest(clientId: string, message: Partial<ReactNativeMessage>) {
    if (!message.target) {
      this.fastify.log.error(
        'Failed to forward request - message.target is missing',
        { clientId, message }
      );
      return;
    }

    const socket = this.getClientSocket(message.target);
    socket.send(
      JSON.stringify({
        version: WebSocketMessageServer.PROTOCOL_VERSION,
        method: message.method,
        params: message.params,
        id:
          message.id === undefined
            ? undefined
            : { requestId: message.id, clientId },
      })
    );
  }

  forwardResponse(message: Partial<ReactNativeMessage>) {
    if (!message.id) {
      return;
    }

    const socket = this.getClientSocket(message.id.clientId);
    socket.send(
      JSON.stringify({
        version: WebSocketMessageServer.PROTOCOL_VERSION,
        result: message.result,
        error: message.error,
        id: message.id.requestId,
      })
    );
  }

  processServerRequest(clientId: string, message: Partial<ReactNativeMessage>) {
    let result: string | Record<string, Record<string, string>>;

    switch (message.method) {
      case 'getid':
        result = clientId;
        break;
      case 'getpeers': {
        const output: Record<string, Record<string, string>> = {};
        this.clients.forEach((peerSocket, peerId) => {
          if (clientId !== peerId) {
            const { searchParams } = new URL(peerSocket.upgradeReq?.url || '');
            output[peerId] = [...searchParams.entries()].reduce(
              (acc, [key, value]) => ({
                ...acc,
                [key]: value,
              }),
              {}
            );
          }
        });
        result = output;
        break;
      }
      default:
        throw new Error(
          `Cannot process server request - unknown method ${JSON.stringify({
            clientId,
            message,
          })}`
        );
    }

    const socket = this.getClientSocket(clientId);
    socket.send(
      JSON.stringify({
        version: WebSocketMessageServer.PROTOCOL_VERSION,
        result,
        id: message.id,
      })
    );
  }

  sendBroadcast(
    broadcasterId: string | undefined,
    message: Partial<ReactNativeMessage>
  ) {
    const forwarded = {
      version: WebSocketMessageServer.PROTOCOL_VERSION,
      method: message.method,
      params: message.params,
    };

    if (this.clients.size === 0) {
      this.fastify.log.warn(
        'No apps connected.',
        `Sending "${message.method}" to all React Native apps failed.`,
        'Make sure your app is running in the simulator or on a phone connected via USB.'
      );
    }

    for (const [clientId, socket] of this.clients) {
      if (clientId !== broadcasterId) {
        try {
          socket.send(JSON.stringify(forwarded));
        } catch (error) {
          this.fastify.log.error('Failed to send broadcast', {
            clientId,
            error,
            forwarded,
          });
        }
      }
    }
  }

  broadcast(method: string, params?: Record<string, any>) {
    this.sendBroadcast(undefined, { method, params });
  }

  onConnection(socket: WebSocket, request: IncomingMessage) {
    const clientId = `client#${this.nextClientId++}`;
    let client: WebSocketWithUpgradeReq = socket;
    client.upgradeReq = request;
    this.clients.set(clientId, client);

    const onClose = () => {
      socket.removeAllListeners();
      this.clients.delete(clientId);
    };

    socket.addEventListener('error', onClose);
    socket.addEventListener('close', onClose);
    socket.addEventListener('message', (event) => {
      const message = this.parseMessage(
        event.data,
        // @ts-ignore
        event.binary
      );

      if (!message) {
        this.fastify.log.error('Received message not matching protocol', {
          clientId,
          message,
        });
        return;
      }

      try {
        if (WebSocketMessageServer.isBroadcast(message)) {
          this.sendBroadcast(clientId, message);
        } else if (WebSocketMessageServer.isRequest(message)) {
          if (message.target === 'server') {
            this.processServerRequest(clientId, message);
          } else {
            this.forwardRequest(clientId, message);
          }
        } else if (WebSocketMessageServer.isResponse(message)) {
          this.forwardResponse(message);
        } else {
          throw new Error(
            `Invalid message, did not match the protocol ${JSON.stringify({
              clientId,
              message,
            })}`
          );
        }
      } catch (error) {
        this.handleError(clientId, message, error.toString());
      }
    });
  }
}
