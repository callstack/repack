import Fastify, { FastifyServerOptions } from 'fastify';
import fastifySensible from '@fastify/sensible';
import compilerPlugin, { CompilerOptions } from './plugins/compiler';
import devtoolsPlugin from './plugins/devtools';
import wssPlugin from './plugins/wss';
import type { DevServerOptions } from './types';
import symbolicatePlugin, { SymbolicateOptions } from './plugins/symbolicate';

export interface DevServerConfig {
  rootDir: string;
  server: DevServerOptions;
  compiler: CompilerOptions;
  symbolicate: SymbolicateOptions;
  messages?: {
    hello?: string;
    status?: string;
  };
  logger?: FastifyServerOptions['logger'];
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
    instance,
  };
}
