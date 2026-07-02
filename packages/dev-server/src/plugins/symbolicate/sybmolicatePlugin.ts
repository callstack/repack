import type { FastifyInstance, FastifyRequest } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import type { Server } from '../../types.js';
import { Symbolicator } from './Symbolicator.js';
import type { ReactNativeStackFrame } from './types.js';

interface SymbolicateRequestBody {
  stack: ReactNativeStackFrame[];
}

function getStackFromRequestBody(request: FastifyRequest) {
  let body: SymbolicateRequestBody;

  if (request.headers['content-type'] === 'application/json') {
    // RN >= 0.79 uses application/json
    body = request.body as SymbolicateRequestBody;
  } else {
    // RN < 0.79 uses text/plain
    body = JSON.parse(request.body as string) as SymbolicateRequestBody;
  }

  return body.stack;
}

function getFirstUsefulFrame(stack: ReactNativeStackFrame[]) {
  return (
    stack.find(
      (frame) =>
        frame.file &&
        !frame.file.includes('.bundle') &&
        !frame.file.includes('.hot-update.js')
    ) ?? stack[0]
  );
}

function isRuntimeErrorStack(stack: ReactNativeStackFrame[]) {
  return stack.some((frame) =>
    [
      'react-stack-bottom-frame',
      'renderWithHooks',
      'beginWork',
      'performUnitOfWork',
    ].includes(frame.methodName ?? '')
  );
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
        const frame = getFirstUsefulFrame(results.stack);
        if (isRuntimeErrorStack(stack) && frame?.file && frame.lineNumber) {
          const column = frame.column ?? 0;

          request.log.info({
            msg: `Symbolicated stack frame: ${frame.file}:${frame.lineNumber}:${column}`,
            methodName: frame.methodName,
          });
        }
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
