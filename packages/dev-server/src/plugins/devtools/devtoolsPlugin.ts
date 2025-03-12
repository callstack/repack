import type { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import launchEditor from 'launch-editor';
import open from 'open';

interface OpenURLRequestBody {
  url: string;
}

interface OpenStackFrameRequestBody {
  file: string;
  lineNumber: number;
}

async function devtoolsPlugin(instance: FastifyInstance) {
  // reference implementation in `@react-native-community/cli-server-api`:
  // https://github.com/react-native-community/cli/blob/46436a12478464752999d34ed86adf3212348007/packages/cli-server-api/src/openURLMiddleware.ts
  instance.route({
    method: ['POST'],
    url: '/open-url',
    handler: async (request, reply) => {
      const { url } = JSON.parse(request.body as string) as OpenURLRequestBody;
      await open(url);
      reply.send('OK');
    },
  });

  // reference implementation in `@react-native-community/cli-server-api`:
  // https://github.com/react-native-community/cli/blob/46436a12478464752999d34ed86adf3212348007/packages/cli-server-api/src/openStackFrameMiddleware.ts
  instance.route({
    method: ['POST'],
    url: '/open-stack-frame',
    handler: (request, reply) => {
      const { file, lineNumber } = JSON.parse(
        request.body as string
      ) as OpenStackFrameRequestBody;
      launchEditor(`${file}:${lineNumber}`, process.env.REACT_EDITOR);
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
  dependencies: ['wss-plugin'],
});
