import { Writable } from 'node:stream';
import util from 'node:util';
import middie from '@fastify/middie';
import fastifySensible from '@fastify/sensible';
import Fastify from 'fastify';
import { createProxyMiddleware } from 'http-proxy-middleware';
import apiPlugin from './plugins/api/apiPlugin.js';
import compilerPlugin from './plugins/compiler/compilerPlugin.js';
import devtoolsPlugin from './plugins/devtools/devtoolsPlugin.js';
import faviconPlugin from './plugins/favicon/faviconPlugin.js';
import multipartPlugin from './plugins/multipart/multipartPlugin.js';
import symbolicatePlugin from './plugins/symbolicate/sybmolicatePlugin.js';
import wssPlugin from './plugins/wss/wssPlugin.js';
import { Internal, type Middleware, type Server } from './types.js';
import { normalizeOptions } from './utils/normalizeOptions.js';

/**
 * Create instance of development server, powered by Fastify.
 *
 * @param config Server configuration.
 * @returns `start` and `stop` functions as well as an underlying Fastify `instance`.
 */
export async function createServer(config: Server.Config) {
  // biome-ignore lint/style/useConst: needed in fastify constructor
  let delegate: Server.Delegate;

  const options = normalizeOptions(config.options);

  /** Fastify instance powering the development server. */
  const instance = Fastify({
    disableRequestLogging: options.disableRequestLogging,
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
    ...(options.https ? { https: options.https } : {}),
  });

  delegate = config.delegate({
    options,
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
    broadcastToHmrClients: (event) => {
      instance.wss.hmrServer.send(event);
    },
    broadcastToMessageClients: ({ method, params }) => {
      instance.wss.messageServer.broadcast(method, params);
    },
  });

  let handledDevMiddlewareNotice = false;

  const devMiddleware = options.devMiddleware.createDevMiddleware({
    projectRoot: options.rootDir,
    serverBaseUrl: options.url,
    logger: {
      error: (...msg) => {
        const message = util.format(...msg);
        instance.log.error(message);
      },
      warn: (...msg) => {
        const message = util.format(...msg);
        instance.log.warn(message);
      },
      info: (...msg) => {
        const message = util.format(...msg);
        try {
          if (!handledDevMiddlewareNotice) {
            if (message.includes('JavaScript logs have moved!')) {
              handledDevMiddlewareNotice = true;
              return;
            }
          } else {
            instance.log.debug(message);
            return;
          }
        } catch (e) {
          console.log(e);
        }
      },
    },
    // we need to let `Network.loadNetworkResource` event pass
    // through the InspectorProxy interceptor, otherwise it will
    // prevent fetching source maps over the network for MF2 remotes
    unstable_customInspectorMessageHandler: (connection) => {
      return {
        handleDeviceMessage: () => {},
        handleDebuggerMessage: (msg: { method?: string }) => {
          if (msg.method === 'Network.loadNetworkResource') {
            connection.device.sendMessage(msg);
            return true;
          }
        },
      };
    },
    unstable_experiments: {
      // @ts-expect-error removed in 0.76, keep this for backkwards compatibility
      enableNewDebugger: true,
    },
  });

  const proxyMiddlewares = options.proxy?.map((proxyOptions) => {
    return createProxyMiddleware(proxyOptions);
  });

  // Register plugins
  await instance.register(fastifySensible);
  await instance.register(middie);
  await instance.register(wssPlugin, {
    delegate,
    endpoints: devMiddleware.websocketEndpoints,
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
    reply.header('X-React-Native-Project-Root', options.rootDir);

    const [pathname] = request.url.split('?');
    if (pathname.endsWith('.map')) {
      reply.header('Access-Control-Allow-Origin', 'devtools://devtools');
    }

    return payload;
  });

  // Setup middlewares
  // Expose built-in middlewares to setupMiddlewares
  const builtInMiddlewares: Middleware[] = [
    {
      name: 'dev-middleware',
      middleware: devMiddleware.middleware,
    },
    ...(proxyMiddlewares?.map((proxyMiddleware, index) => ({
      name: `proxy-middleware-${index}`,
      middleware: proxyMiddleware,
    })) ?? []),
  ];

  const finalMiddlewares = options.setupMiddlewares(
    builtInMiddlewares,
    instance
  );

  // Register middlewares
  finalMiddlewares.forEach((middleware) => {
    if (typeof middleware === 'object') {
      if (middleware.path !== undefined) {
        instance.use(middleware.path, middleware.middleware);
      } else {
        instance.use(middleware.middleware);
      }
    } else {
      instance.use(middleware);
    }
  });

  // Register routes
  instance.get('/', async () => delegate.messages.getHello());
  instance.get('/status', async () => delegate.messages.getStatus());

  /** Start the development server. */
  async function start() {
    await instance.listen({
      port: options.port,
      host: options.host,
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
