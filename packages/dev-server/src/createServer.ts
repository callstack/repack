import { Writable } from 'stream';
import Fastify from 'fastify';
import fastifySensible from '@fastify/sensible';
import middie from '@fastify/middie';
// eslint-disable-next-line import/no-unresolved -- no main field in package.json
import { createDevMiddleware } from '@react-native/dev-middleware';
import multipartPlugin from './plugins/multipart';
import compilerPlugin from './plugins/compiler';
import apiPlugin from './plugins/api';
import wssPlugin from './plugins/wss';
import faviconPlugin from './plugins/favicon';
import { Internal, Server } from './types';
import symbolicatePlugin from './plugins/symbolicate';

/**
 * Create instance of development server, powered by Fastify.
 *
 * @param config Server configuration.
 * @returns `start` and `stop` functions as well as an underlying Fastify `instance`.
 */
export async function createServer(config: Server.Config) {
  let delegate: Server.Delegate;

  /** Fastify instance powering the development server. */
  const instance = Fastify({
    logger: {
      level: 'trace',
      stream: new Writable({
        write: (chunk, _encoding, callback) => {
          const log = JSON.parse(chunk.toString());
          delegate?.logger.onMessage(log);
          instance.wss?.apiServer.send(log);
          callback();
        },
      }),
    },
    ...(config.options.https ? { https: config.options.https } : undefined),
  });

  delegate = config.delegate({
    log: instance.log,
    notifyBuildStart: (platform) => {
      instance.wss.apiServer.send({
        event: Internal.EventTypes.BuildStart,
        platform,
      });
    },
    notifyBuildEnd: (platform) => {
      instance.wss.apiServer.send({
        event: Internal.EventTypes.BuildEnd,
        platform,
      });
    },
    broadcastToHmrClients: (event, platform, clientIds) => {
      instance.wss.hmrServer.send(event, platform, clientIds);
    },
    broadcastToMessageClients: ({ method, params }) => {
      instance.wss.messageServer.broadcast(method, params);
    },
  });

  await instance.register(middie);

  const { middleware, websocketEndpoints } = createDevMiddleware({
    projectRoot: config.options.rootDir,
    serverBaseUrl: `http://${config.options.host}:${config.options.port}`,
    logger: console,
    unstable_experiments: {
      // NOTE: Only affects the /open-debugger endpoint
      enableNewDebugger: config.experiments?.experimentalDebugger,
    },
  });

  instance.use(middleware);

  // Register plugins
  await instance.register(fastifySensible);
  await instance.register(wssPlugin, {
    options: {
      ...config.options,
      websocketEndpoints,
    },
    delegate,
  });
  await instance.register(multipartPlugin);
  await instance.register(apiPlugin, {
    delegate,
    prefix: '/api',
  });
  await instance.register(compilerPlugin, {
    delegate,
  });
  await instance.register(symbolicatePlugin, {
    delegate,
  });

  // below is to prevent showing `GET 400 /favicon.ico`
  // errors in console when requesting the bundle via browser
  await instance.register(faviconPlugin);

  instance.addHook('onSend', async (request, reply, payload) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-React-Native-Project-Root', config.options.rootDir);

    const [pathname] = request.url.split('?');
    if (pathname.endsWith('.map')) {
      reply.header('Access-Control-Allow-Origin', 'devtools://devtools');
    }

    return payload;
  });

  // Register routes
  instance.get('/', async () => delegate.messages.getHello());
  instance.get('/status', async () => delegate.messages.getStatus());

  /** Start the development server. */
  async function start() {
    await instance.listen({
      port: config.options.port,
      host: config.options.host,
    });
  }

  /** Stop the development server. */
  async function stop() {
    await instance.close();
  }

  return {
    start,
    stop,
    instance,
  };
}
