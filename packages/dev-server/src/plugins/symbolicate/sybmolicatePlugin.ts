import type { FastifyInstance, FastifyRequest } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import type { Server } from '../../types.js';
import { logSymbolicatedStackFrame } from './logSymbolicatedStackFrame.js';
import { Symbolicator } from './Symbolicator.js';
import type { ReactNativeStackFrame } from './types.js';

interface SymbolicateRequestBody {
  stack: ReactNativeStackFrame[];
}

function getStackFromRequestBody(request: FastifyRequest) {
  return (request.body as SymbolicateRequestBody).stack;
}

async function symbolicatePlugin(
  instance: FastifyInstance,
  {
    delegate,
  }: {
    delegate: Server.Delegate;
  }
) {
  const symbolicator = new Symbolicator(delegate.symbolicator);

  instance.post('/symbolicate', async (request, reply) => {
    try {
      const stack = getStackFromRequestBody(request);
      const platform = Symbolicator.inferPlatformFromStack(stack);
      if (!platform) {
        request.log.debug({ msg: 'Received stack', stack });
        reply.badRequest('Cannot infer platform from stack trace');
      } else {
        request.log.debug({ msg: 'Starting symbolication', platform, stack });
        const results = await symbolicator.process(request.log, stack);
        logSymbolicatedStackFrame(request.log, stack, results);
        reply.send(results);
      }
    } catch (error) {
      request.log.error({
        msg: 'Failed to symbolicate',
        error: (error as Error).message,
      });
      reply.internalServerError();
    }
  });
}

export default fastifyPlugin(symbolicatePlugin, {
  name: 'symbolicate-plugin',
  dependencies: ['@fastify/sensible'],
});
