import { WebSocketServer } from 'ws';
import { FastifyInstance } from 'fastify';
import { DevMiddlewareServer } from './servers/DevMiddlewareServer';

export const convertDevMiddlewareWebsocketServers = (
  websocketEndpoints: { [key: string]: WebSocketServer },
  fastifyInstance: FastifyInstance
) => {
  return Object.keys(websocketEndpoints).map((path) => {
    const server = websocketEndpoints[path];
    return new DevMiddlewareServer(fastifyInstance, path, server);
  });
};
