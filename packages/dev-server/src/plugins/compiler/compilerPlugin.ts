import type { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import type { Server } from '../../types';
import type { SendProgress } from '../../types';

async function compilerPlugin(
  instance: FastifyInstance,
  { delegate }: { delegate: Server.Delegate }
) {
  instance.route({
    method: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    url: '/*',
    schema: {
      querystring: {
        type: 'object',
        properties: {
          platform: {
            type: 'string',
          },
        },
      },
    },
    handler: async (request, reply) => {
      let file = (request.params as { '*'?: string })['*'];
      const multipart = reply.asMultipart();

      const sendProgress: SendProgress = ({ completed, total }) => {
        multipart?.writeChunk(
          { 'Content-Type': 'application/json' },
          JSON.stringify({
            done: completed,
            total,
          })
        );
      };

      try {
        const asset = await delegate.compiler.getAsset(
          request.url,
          undefined,
          sendProgress
        );
        const mimeType = delegate.compiler.getMimeType(file!);

        if (multipart) {
          const buffer = Buffer.isBuffer(asset) ? asset : Buffer.from(asset);
          multipart.setHeader('Content-Type', `${mimeType}; charset=UTF-8`);
          multipart.setHeader(
            'Content-Length',
            String(Buffer.byteLength(buffer))
          );
          multipart.end(buffer);
        } else {
          return reply.code(200).type(mimeType).send(asset);
        }
      } catch (error) {
        request.log.error(error);
        return reply.notFound((error as Error).message);
      }
    },
  });
}

export default fastifyPlugin(compilerPlugin, {
  name: 'compiler-plugin',
  dependencies: ['@fastify/sensible', 'multipart-plugin'],
});
