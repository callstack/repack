import Fastify, { FastifyServerOptions } from 'fastify';
import fastifySensible from '@fastify/sensible';
import compilerPlugin, { CompilerOptions } from './plugins/compiler';

export interface DevServerConfig {
  port: number;
  host?: string;
  https?: {
    cert?: string;
    key?: string;
  };
  messages?: {
    hello?: string;
    status?: string;
  };
  logger?: FastifyServerOptions['logger'];
  compiler: CompilerOptions;
}

export async function createServer(config: DevServerConfig) {
  const {
    messages: {
      hello: helloMessage = 'React Native packager is running',
      status: statusMessage = 'packager-status:running',
    } = {},
  } = config;

  const instance = Fastify({
    logger: config.logger,
    ...(config.https ? { https: config.https } : undefined),
  });

  // Register plugins
  await instance.register(fastifySensible);
  await instance.register(compilerPlugin, {
    compiler: config.compiler,
  });

  // Register routes

  instance.get('/', async () => helloMessage);

  instance.get('/status', async () => statusMessage);

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
      return reply.sendBundleAsset(file, platform);
    }
  );

  async function listen() {
    await instance.listen(config.port, config.host);
  }

  async function close() {
    await instance.close();
  }

  return {
    listen,
    close,
    instance,
  };
}
