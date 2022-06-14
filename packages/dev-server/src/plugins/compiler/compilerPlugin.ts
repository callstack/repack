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
      const file = (request.params as { '*'?: string })['*'];
      let { platform } = request.query as { platform?: string };

      if (!file) {
        return reply.notFound();
      }

      // Let consumer infer the platform. If function is not provided fallback
      // to platform query param.
      platform = delegate.compiler.inferPlatform?.(request.url) ?? platform;

      if (!platform) {
        return reply.badRequest('Cannot detect platform');
      }

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

      const asset = await delegate.compiler.getAsset(
        file,
        platform,
        sendProgress
      );
      const mimeType = delegate.compiler.getMimeType(file, platform, asset);

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
    },
  });
}

export default fastifyPlugin(compilerPlugin, {
  name: 'compiler-plugin',
  dependencies: ['fastify-sensible', 'multipart-plugin'],
});
