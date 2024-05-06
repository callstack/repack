import type { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import type { Server } from '../../types';
import { WebSocketDebuggerServer } from './servers/WebSocketDebuggerServer';
import { WebSocketDevClientServer } from './servers/WebSocketDevClientServer';
import { WebSocketMessageServer } from './servers/WebSocketMessageServer';
import { WebSocketEventsServer } from './servers/WebSocketEventsServer';
import { WebSocketApiServer } from './servers/WebSocketApiServer';
import { WebSocketHMRServer } from './servers/WebSocketHMRServer';
import { WebSocketRouter } from './WebSocketRouter';
import { WebSocketServerAdapter } from './WebSocketServerAdapter';

declare module 'fastify' {
  interface FastifyInstance {
    wss: {
      debuggerServer: WebSocketDebuggerServer;
      devClientServer: WebSocketDevClientServer;
      messageServer: WebSocketMessageServer;
      eventsServer: WebSocketEventsServer;
      apiServer: WebSocketApiServer;
      hmrServer: WebSocketHMRServer;
      deviceConnectionServer: WebSocketServerAdapter;
      debuggerConnectionServer: WebSocketServerAdapter;
      router: WebSocketRouter;
    };
  }
}

/**
 * Defined in @react-native/dev-middleware
 * Reference: https://github.com/facebook/react-native/blob/main/packages/dev-middleware/src/inspector-proxy/InspectorProxy.js
 */
const WS_DEVICE_URL = '/inspector/device';
const WS_DEBUGGER_URL = '/inspector/debug';

async function wssPlugin(
  instance: FastifyInstance,
  {
    options,
    delegate,
  }: {
    options: Server.Options;
    delegate: Server.Delegate;
  }
) {
  const router = new WebSocketRouter(instance);

  const debuggerServer = new WebSocketDebuggerServer(instance);
  const devClientServer = new WebSocketDevClientServer(instance);
  const messageServer = new WebSocketMessageServer(instance);
  const eventsServer = new WebSocketEventsServer(instance, {
    webSocketMessageServer: messageServer,
  });
  const apiServer = new WebSocketApiServer(instance);
  const hmrServer = new WebSocketHMRServer(instance, delegate.hmr);

  // @react-native/dev-middleware servers
  const deviceConnectionServer = new WebSocketServerAdapter(
    instance,
    WS_DEVICE_URL,
    options.endpoints?.[WS_DEVICE_URL]
  );

  const debuggerConnectionServer = new WebSocketServerAdapter(
    instance,
    WS_DEBUGGER_URL,
    options.endpoints?.[WS_DEBUGGER_URL]
  );

  router.registerServer(debuggerServer);
  router.registerServer(devClientServer);
  router.registerServer(messageServer);
  router.registerServer(eventsServer);
  router.registerServer(apiServer);
  router.registerServer(hmrServer);
  router.registerServer(deviceConnectionServer);
  router.registerServer(debuggerConnectionServer);

  instance.decorate('wss', {
    debuggerServer,
    devClientServer,
    messageServer,
    eventsServer,
    apiServer,
    hmrServer,
    deviceConnectionServer,
    debuggerConnectionServer,
    router,
  });
}

export default fastifyPlugin(wssPlugin, {
  name: 'wss-plugin',
});
