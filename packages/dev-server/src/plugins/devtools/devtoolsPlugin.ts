import type { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';

async function devtoolsPlugin(instance: FastifyInstance) {
  instance.route({
    method: ['GET', 'POST', 'PUT'],
    url: '/reload',
    handler: (_request, reply) => {
      instance.wss.messageServer.broadcast('reload');
      reply.send('OK');
    },
  });
}

export default fastifyPlugin(devtoolsPlugin, {
  name: 'devtools-plugin',
  dependencies: ['wss-plugin'],
});
