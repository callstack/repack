import type { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import type { Server } from '../../types';
import { Symbolicator } from './Symbolicator';
import type { ReactNativeStackFrame } from './types';

async function symbolicatePlugin(
  instance: FastifyInstance,
  {
    delegate,
  }: {
    delegate: Server.Delegate;
  }
) {
  const symbolicator = new Symbolicator(instance.log, delegate.symbolicator);

  instance.post(
    '/symbolicate',
    {
      schema: {
        body: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              lineNumber: { type: 'number' },
              column: { type: 'number' },
              file: { type: 'string' },
              methodName: { type: 'string' },
            },
            required: ['methodName'],
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { stack } = request.body as {
          stack: ReactNativeStackFrame[];
        };
        const platform = Symbolicator.inferPlatformFromStack(stack);
        if (!platform) {
          reply.badRequest('Cannot infer platform from stack trace');
        } else {
          const results = await symbolicator.process(stack);
          reply.send(results);
        }
      } catch (error) {
        request.log.error({
          msg: 'Failed to symbolicate',
          error: (error as Error).message,
        });
        reply.internalServerError();
      }
    }
  );
}

export default fastifyPlugin(symbolicatePlugin, {
  name: 'symbolicate-plugin',
});
