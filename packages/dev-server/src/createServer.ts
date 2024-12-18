import { Writable } from 'node:stream';
import middie from '@fastify/middie';
import fastifySensible from '@fastify/sensible';
import { createDevMiddleware } from '@react-native/dev-middleware';
import Fastify from 'fastify';
import apiPlugin from './plugins/api/apiPlugin.ts';
import compilerPlugin from './plugins/compiler/compilerPlugin.ts';
import devtoolsPlugin from './plugins/devtools/devtoolsPlugin.ts';
import faviconPlugin from './plugins/favicon/faviconPlugin.ts';
import multipartPlugin from './plugins/multipart/multipartPlugin.ts';
import symbolicatePlugin from './plugins/symbolicate/sybmolicatePlugin.ts';
import wssPlugin from './plugins/wss/wssPlugin.ts';
import { Internal, type Server } from './types.ts';

/**
 * Create instance of development server, powered by Fastify.
 *
 * @param config Server configuration.
 * @returns `start` and `stop` functions as well as an underlying Fastify `instance`.
 */
export async function createServer(config: Server.Config) {
  // biome-ignore lint/style/useConst: needed in fastify constructor
  let delegate: Server.Delegate;

  /** Fastify instance powering the development server. */
  const instance = Fastify({
    disableRequestLogging: !config.options.logRequests,
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

  delegate = await config.delegate({
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

  const devMiddleware = createDevMiddleware({
    projectRoot: config.options.rootDir,
    serverBaseUrl: `http://${config.options.host}:${config.options.port}`,
    logger: instance.log,
    unstable_experiments: {
      // @ts-expect-error removed in 0.76, keep this for backkwards compatibility
      enableNewDebugger: true,
    },
  });

  // Register plugins
  await instance.register(fastifySensible);
  await instance.register(middie);
  await instance.register(wssPlugin, {
    options: {
      ...config.options,
      endpoints: devMiddleware.websocketEndpoints,
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
  await instance.register(devtoolsPlugin, {
    options: config.options,
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

  // Register dev middleware
  instance.use(devMiddleware.middleware);

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
