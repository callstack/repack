import type { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import type { Server } from '../../types';
import { WebSocketDebuggerServer } from './servers/WebSocketDebuggerServer';
import { WebSocketDevClientServer } from './servers/WebSocketDevClientServer';
import { WebSocketMessageServer } from './servers/WebSocketMessageServer';
import { WebSocketEventsServer } from './servers/WebSocketEventsServer';
import { HermesInspectorProxy } from './servers/HermesInspectorProxy';
import { WebSocketDashboardServer } from './servers/WebSocketDashboardServer';
import { WebSocketHMRServer } from './servers/WebSocketHMRServer';
import { WebSocketRouter } from './WebSocketRouter';

declare module 'fastify' {
  interface FastifyInstance {
    wss: {
      debuggerServer: WebSocketDebuggerServer;
      devClientServer: WebSocketDevClientServer;
      messageServer: WebSocketMessageServer;
      eventsServer: WebSocketEventsServer;
      hermesInspectorProxy: HermesInspectorProxy;
      dashboardServer: WebSocketDashboardServer;
      hmrServer: WebSocketHMRServer;
      router: WebSocketRouter;
    };
  }
}

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
  const hermesInspectorProxy = new HermesInspectorProxy(instance, options);
  const dashboardServer = new WebSocketDashboardServer(instance);
  const hmrServer = new WebSocketHMRServer(instance, delegate.hmr);

  router.registerServer(debuggerServer);
  router.registerServer(devClientServer);
  router.registerServer(messageServer);
  router.registerServer(eventsServer);
  router.registerServer(hermesInspectorProxy);
  router.registerServer(dashboardServer);
  router.registerServer(hmrServer);

  instance.decorate('wss', {
    debuggerServer,
    devClientServer,
    messageServer,
    eventsServer,
    hermesInspectorProxy,
    dashboardServer,
    router,
  });
}

export default fastifyPlugin(wssPlugin, {
  name: 'wss-plugin',
});
