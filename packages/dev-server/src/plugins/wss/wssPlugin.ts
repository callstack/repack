import type { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { WebSocketServer } from 'ws';
import type { Server } from '../../types';
import { WebSocketDebuggerServer } from './servers/WebSocketDebuggerServer';
import { WebSocketDevClientServer } from './servers/WebSocketDevClientServer';
import { WebSocketMessageServer } from './servers/WebSocketMessageServer';
import { WebSocketEventsServer } from './servers/WebSocketEventsServer';
import { WebSocketApiServer } from './servers/WebSocketApiServer';
import { WebSocketHMRServer } from './servers/WebSocketHMRServer';
import { WebSocketRouter } from './WebSocketRouter';
import { convertDevMiddlewareWebsocketServers } from './convertDevMiddlewareWebsocketServers';

declare module 'fastify' {
  interface FastifyInstance {
    wss: {
      debuggerServer: WebSocketDebuggerServer;
      devClientServer: WebSocketDevClientServer;
      messageServer: WebSocketMessageServer;
      eventsServer: WebSocketEventsServer;
      apiServer: WebSocketApiServer;
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
    options: Server.Options & {
      websocketEndpoints: { [key: string]: WebSocketServer };
    };
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

  router.registerServer(debuggerServer);
  router.registerServer(devClientServer);
  router.registerServer(messageServer);
  router.registerServer(eventsServer);
  router.registerServer(apiServer);
  router.registerServer(hmrServer);

  // Convert websocket servers returned from the RN dev middleware to match Repack structure
  const devMiddlewareWebsocketServers = convertDevMiddlewareWebsocketServers(
    options.websocketEndpoints,
    instance
  );

  devMiddlewareWebsocketServers.forEach((server) => {
    router.registerServer(server);
  });

  instance.decorate('wss', {
    debuggerServer,
    devClientServer,
    messageServer,
    eventsServer,
    apiServer,
    hmrServer,
    ...devMiddlewareWebsocketServers,
    router,
  });
}

export default fastifyPlugin(wssPlugin, {
  name: 'wss-plugin',
});
