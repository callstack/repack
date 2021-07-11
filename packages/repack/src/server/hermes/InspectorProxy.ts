import { IncomingMessage } from 'http';
import { URL } from 'url';
import WebSocket from 'ws';
// @ts-ignore
import Device from 'metro-inspector-proxy/src/Device';
import { BaseDevServerConfig } from '../BaseDevServer';
import { FastifyDevServer, OnSendHookHandler } from '../types';
import { WebSocketServer } from '../ws';

const WS_DEVICE_URL = '/inspector/device';
const WS_DEBUGGER_URL = '/inspector/debug';

interface PageDescription {
  id: string;
  description: string;
  title: string;
  faviconUrl: string;
  devtoolsFrontendUrl: string;
  type: string;
  webSocketDebuggerUrl: string;
  vm?: string;
}

interface Page {
  id: string;
  title: string;
  app: string;
  vm?: string;
}

export interface InspectorProxyConfig extends BaseDevServerConfig {}

export class InspectorProxy extends WebSocketServer {
  private devices = new Map<number, Device>();
  private deviceCounter = 0;
  public readonly serverHost: string;

  constructor(fastify: FastifyDevServer, private config: InspectorProxyConfig) {
    super(fastify, [WS_DEVICE_URL, WS_DEBUGGER_URL]);
    this.serverHost = `${this.config.host || 'localhost'}:${this.config.port}`;
    this.setup();
  }

  private setup() {
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
      for (const [deviceId, device] of this.devices) {
        const devicePages = device.getPagesList();
        for (const page of devicePages) {
          pages.push(this.buildPageDescription(deviceId, page));
        }
      }

      return pages;
    };

    this.fastify.get('/json/list', { onSend }, pageListHandler);
    this.fastify.get('/json', { onSend }, pageListHandler);
  }

  private buildPageDescription(deviceId: number, page: Page) {
    const debuggerUrl = `${this.serverHost}${WS_DEBUGGER_URL}?device=${deviceId}&page=${page.id}`;
    const webSocketDebuggerUrl = 'ws://' + debuggerUrl;
    const devtoolsFrontendUrl =
      'chrome-devtools://devtools/bundled/inspector.html?experiments=true&v8only=true&ws=' +
      encodeURIComponent(debuggerUrl);
    return {
      id: `${deviceId}-${page.id}`,
      description: page.app,
      title: page.title,
      faviconUrl: 'https://reactjs.org/favicon.ico',
      devtoolsFrontendUrl,
      type: 'node',
      webSocketDebuggerUrl,
      vm: page.vm,
    };
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

      if (url.startsWith('/inspector/device')) {
        const deviceName = searchParams.get('name') ?? 'Unknown';
        const appName = searchParams.get('app') ?? 'Unknown';
        const deviceId = this.deviceCounter++;

        this.devices.set(
          deviceId,
          new Device(deviceId, deviceName, appName, socket, this.config.context)
        );

        this.fastify.log.info({ msg: 'Hermes device connected', deviceId });

        const onClose = () => {
          this.fastify.log.info({
            msg: 'Hermes device disconnected',
            deviceId,
          });
          this.devices.delete(deviceId);
        };

        socket.addEventListener('error', onClose);
        socket.addEventListener('close', onClose);
      } else {
        const deviceId = searchParams.get('device') ?? undefined;
        const pageId = searchParams.get('page') ?? undefined;

        if (deviceId === undefined || pageId === undefined) {
          throw new Error('Incorrect URL - must provide device and page IDs');
        }

        const device = this.devices.get(parseInt(deviceId, 10));
        if (!device) {
          throw new Error('Unknown device with ID ' + deviceId);
        }

        device.handleDebuggerConnection(socket, pageId);
      }
    } catch (error) {
      this.fastify.log.error({
        msg: 'Failed to establish connection with Hermes device',
        error: error.message,
      });
      socket.close(1011, error);
    }
  }
}
