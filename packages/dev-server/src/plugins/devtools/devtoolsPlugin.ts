import fs from 'node:fs';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import launchEditor from 'launch-editor';
import open from 'open';
import type { Server } from '../../types.js';

interface OpenURLRequestBody {
  url: string;
}

interface OpenStackFrameRequestBody {
  file: string;
  lineNumber: number;
}

function parseRequestBody<T>(body: unknown): T {
  if (typeof body === 'object') return body as T;
  if (typeof body === 'string') return JSON.parse(body) as T;
  throw new Error(`Unsupported body type: ${typeof body}`);
}

async function devtoolsPlugin(
  instance: FastifyInstance,
  { delegate }: { delegate: Server.Delegate }
) {
  // reference implementation in `@react-native-community/cli-server-api`:
  // https://github.com/react-native-community/cli/blob/46436a12478464752999d34ed86adf3212348007/packages/cli-server-api/src/openURLMiddleware.ts
  instance.route({
    method: ['POST'],
    url: '/open-url',
    handler: async (request, reply) => {
      const { url } = parseRequestBody<OpenURLRequestBody>(request.body);
      await open(url);
      reply.send('OK');
    },
  });

  // reference implementation in `@react-native-community/cli-server-api`:
  // https://github.com/react-native-community/cli/blob/46436a12478464752999d34ed86adf3212348007/packages/cli-server-api/src/openStackFrameMiddleware.ts
  instance.route({
    method: ['POST'],
    url: '/open-stack-frame',
    handler: async (request, reply) => {
      const { file, lineNumber } = parseRequestBody<OpenStackFrameRequestBody>(
        request.body
      );
      if (
        typeof file !== 'string' ||
        file.includes('\0') ||
        !Number.isFinite(Number(lineNumber))
      ) {
        reply.badRequest('Invalid open-stack-frame request body');
        return;
      }
      const filepath = delegate.devTools?.resolveProjectPath(file) ?? file;

      // launch-editor silently ignores files that don't exist, so surface
      // resolution failures here — otherwise tapping a stack frame does
      // nothing with no trace of why.
      if (!fs.existsSync(filepath)) {
        request.log.warn(
          `Could not open ${file} in your editor: it resolved to ` +
            `${filepath}, which does not exist.`
        );
        reply.send('OK');
        return;
      }

      launchEditor(
        `${filepath}:${lineNumber}`,
        process.env.REACT_EDITOR,
        (fileName, errorMessage) => {
          request.log.warn(
            `Could not open ${path.basename(fileName)} in your editor` +
              `${errorMessage ? `: ${errorMessage}` : ''}. Set the ` +
              'REACT_EDITOR environment variable (e.g. REACT_EDITOR=code) ' +
              'and restart the dev server.'
          );
        }
      );
      reply.send('OK');
    },
  });

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
  dependencies: ['@fastify/sensible', 'wss-plugin'],
});
