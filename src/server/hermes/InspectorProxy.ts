import { IncomingMessage } from 'http';
import { URL } from 'url';
import WebSocket from 'ws';
import { BaseDevServerConfig } from '../BaseDevServer';
import { FastifyDevServer, OnSendHookHandler } from '../types';
import { WebSocketServer } from '../ws';
import { Device } from './Device';
import { PageDescription } from './Page';

export interface InspectorProxyConfig extends BaseDevServerConfig {}

export class InspectorProxy extends WebSocketServer {
  private devices = new Map<number, Device>();
  private deviceCounter = 0;

  constructor(fastify: FastifyDevServer, private config: InspectorProxyConfig) {
    super(fastify, '/inspector/device');
    this.initRoutes();
  }

  private initRoutes() {
    const serverHost = `${this.config.host ?? 'localhost'}:${this.config.port}`;

    const onSend: OnSendHookHandler<any> = (
      _request,
      reply,
      _payload,
      done
    ) => {
      reply.headers({
        'Content-Type': 'application/json; charset=UTF-8',
        'Cache-Control': 'no-cache',
        Connection: 'close',
      });
      done();
    };

    this.fastify.get('/json/version', { onSend }, async () => {
      return {
        Browser: 'Mobile JavaScript',
        'Protocol-Version': '1.1',
      };
    });

    const pageListHandler = async () => {
      const pages: PageDescription[] = [];
      for (const [, device] of this.devices) {
        const devicePages = device.getPages();
        for (const page of devicePages) {
          pages.push(page.buildDescription(serverHost));
        }
      }

      return pages;
    };

    this.fastify.get('/json/list', { onSend }, pageListHandler);
    this.fastify.get('/json', { onSend }, pageListHandler);
  }

  /**
   * Process new WebSocket connection from device.
   *
   * @param socket Incoming device's WebSocket connection.
   * @param request Upgrade request for the connection.
   */
  onConnection(socket: WebSocket, request: IncomingMessage) {
    try {
      const { url = '' } = request;
      const { searchParams } = new URL(url, 'http://localhost');
      const deviceName = searchParams.get('name') ?? 'Unknown';
      const appName = searchParams.get('app') ?? 'Unknown';
      const deviceId = this.deviceCounter++;

      this.devices.set(
        deviceId,
        new Device(deviceId, deviceName, appName, this.config.context, socket)
      );

      this.fastify.log.info({ msg: 'Hermes device connected', deviceId });

      const onClose = () => {
        this.fastify.log.info({ msg: 'Hermes device disconnected', deviceId });
        this.devices.delete(deviceId);
      };

      socket.addEventListener('error', onClose);
      socket.addEventListener('close', onClose);

      // this.sendAction('sync');
    } catch (error) {
      this.fastify.log.error({
        msg: 'Failed to establish connection with Hermes device',
        error: error.message,
      });
      socket.close(1011, error);
    }
  }
}
