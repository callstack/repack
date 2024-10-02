import type { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import open from 'open';
import type { Server } from '../../types';

async function devtoolsPlugin(
  instance: FastifyInstance,
  { options }: { options: Server.Options }
) {
  instance.route({
    method: ['GET', 'POST', 'PUT'],
    url: '/reload',
    handler: (_request, reply) => {
      instance.wss.messageServer.broadcast('reload');
      reply.send('OK');
    },
  });

  instance.route({
    method: ['GET', 'POST', 'PUT'],
    url: '/launch-js-devtools',
    handler: async (request, reply) => {
      const customDebugger = process.env.REACT_DEBUGGER;
      if (customDebugger) {
        // NOOP for now
      } else if (!instance.wss.debuggerServer.isDebuggerConnected()) {
        const url = `${options.https ? 'https' : 'http'}://${
          options.host || 'localhost'
        }:${options.port}/debugger-ui`;
        try {
          request.log.info({ msg: 'Opening debugger UI', url });
          await open(url);
        } catch (error) {
          if (error) {
            request.log.error({
              msg: 'Cannot open debugger UI',
              url,
              error,
            });
          }
        }
      }
      reply.send('OK');
    },
  });
}

export default fastifyPlugin(devtoolsPlugin, {
  name: 'devtools-plugin',
  dependencies: ['wss-plugin'],
});
