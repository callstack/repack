import type { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { Server } from '../../types';

async function compilerPlugin(
  instance: FastifyInstance,
  { delegate }: { delegate: Server.Delegate }
) {
  instance.get(
    '/:file',
    {
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
    },
    async (request, reply) => {
      const { file } = request.params as { file?: string };
      const { platform } = request.query as { platform?: string };

      if (!file) {
        return reply.notFound();
      }

      if (!platform) {
        return reply.badRequest('Missing platform query param');
      }

      const asset = await delegate.compiler.getAsset(file, platform);
      const mimeType = delegate.compiler.getMimeType(file, platform, asset);

      reply.code(200).type(mimeType).send(asset);
    }
  );
}

export default fastifyPlugin(compilerPlugin, {
  name: 'compiler-plugin',
});
