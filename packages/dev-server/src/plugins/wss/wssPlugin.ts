import type { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import type { DevServerOptions } from '../../types';
import { WebSocketDebuggerServer } from './servers/WebSocketDebuggerServer';
import { WebSocketDevClientServer } from './servers/WebSocketDevClientServer';
import { WebSocketMessageServer } from './servers/WebSocketMessageServer';
import { WebSocketEventsServer } from './servers/WebSocketEventsServer';
import { HermesInspectorProxy } from './servers/HermesInspectorProxy';
import { WebSocketRouter } from './WebSocketRouter';

declare module 'fastify' {
  interface FastifyInstance {
    wss: {
      debuggerServer: WebSocketDebuggerServer;
      devClientServer: WebSocketDevClientServer;
      messageServer: WebSocketMessageServer;
      eventsServer: WebSocketEventsServer;
      hermesInspectorProxy: HermesInspectorProxy;
      router: WebSocketRouter;
    };
  }
}

async function wssPlugin(
  instance: FastifyInstance,
  options: { rootDir: string; server: DevServerOptions }
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

  router.registerServer(debuggerServer);
  router.registerServer(devClientServer);
  router.registerServer(messageServer);
  router.registerServer(eventsServer);
  router.registerServer(hermesInspectorProxy);

  instance.decorate('wss', {
    debuggerServer,
    devClientServer,
    messageServer,
    eventsServer,
    hermesInspectorProxy,
    router,
  });
}

export default fastifyPlugin(wssPlugin, {
  name: 'wss-plugin',
});
