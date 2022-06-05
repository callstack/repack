import Fastify from 'fastify';
import fastifySensible from '@fastify/sensible';
import compilerPlugin from './plugins/compiler';
import devtoolsPlugin from './plugins/devtools';
import wssPlugin from './plugins/wss';
import type { DevServerConfig, FastifyDevServer } from './types';
import symbolicatePlugin from './plugins/symbolicate';

export async function createServer(config: DevServerConfig) {
  const {
    messages: {
      hello: helloMessage = 'React Native packager is running',
      status: statusMessage = 'packager-status:running',
    } = {},
  } = config;

  const instance = Fastify({
    logger: config.logger,
    ...(config.server.https ? { https: config.server.https } : undefined),
  });

  // Register plugins
  await instance.register(fastifySensible);
  await instance.register(wssPlugin, {
    rootDir: config.rootDir,
    server: config.server,
  });
  await instance.register(compilerPlugin, {
    compiler: config.compiler,
  });
  await instance.register(symbolicatePlugin, {
    rootDir: config.rootDir,
    server: config.server,
    symbolicate: config.symbolicate,
  });
  await instance.register(devtoolsPlugin, {
    rootDir: config.rootDir,
    server: config.server,
  });

  // await this.fastify.register(fastifyStatic, {
  //   root: path.join(__dirname, '../../first-party/debugger-ui'),
  //   prefix: '/debugger-ui',
  //   prefixAvoidTrailingSlash: true,
  // });

  // this.fastify.addHook('onRequest', async (request, reply) => {
  //   reply.header('X-Content-Type-Options', 'nosniff');

  //   const [pathname] = request.url.split('?');
  //   if (pathname.endsWith('.map')) {
  //     reply.header('Access-Control-Allow-Origin', 'devtools://devtools');
  //   }
  // });

  // Register routes

  instance.get('/', async () => helloMessage);
  instance.get('/status', async () => statusMessage);

  async function listen() {
    await instance.listen(config.server.port, config.server.host);
  }

  async function close() {
    await instance.close();
  }

  return {
    listen,
    close,
    instance: instance as FastifyDevServer,
  };
}
