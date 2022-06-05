import type { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import type { DevServerOptions, EventsOptions } from '../../types';
import { WebSocketDebuggerServer } from './servers/WebSocketDebuggerServer';
import { WebSocketDevClientServer } from './servers/WebSocketDevClientServer';
import { WebSocketMessageServer } from './servers/WebSocketMessageServer';
import { WebSocketEventsServer } from './servers/WebSocketEventsServer';
import { HermesInspectorProxy } from './servers/HermesInspectorProxy';
import { WebSocketDashboardServer } from './servers/WebSocketDashboardServer';
import { WebSocketRouter } from './WebSocketRouter';
import type { WebSocketServersPlugin } from './types';

declare module 'fastify' {
  interface FastifyInstance {
    wss: WebSocketServersPlugin;
  }
}

async function wssPlugin(
  instance: FastifyInstance,
  options: { rootDir: string; events?: EventsOptions; server: DevServerOptions }
) {
  const router = new WebSocketRouter(instance);

  const debuggerServer = new WebSocketDebuggerServer(instance);
  const devClientServer = new WebSocketDevClientServer(instance);
  const messageServer = new WebSocketMessageServer(instance);
  const eventsServer = new WebSocketEventsServer(instance, {
    webSocketMessageServer: messageServer,
  });
  const hermesInspectorProxy = new HermesInspectorProxy(
    instance,
    options.rootDir,
    options.server
  );
  const dashboardServer = new WebSocketDashboardServer(
    instance,
    options.events?.emitter
  );

  router.registerServer(debuggerServer);
  router.registerServer(devClientServer);
  router.registerServer(messageServer);
  router.registerServer(eventsServer);
  router.registerServer(hermesInspectorProxy);
  router.registerServer(dashboardServer);

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
