import { Writable } from 'stream';
import Fastify from 'fastify';
import fastifySensible from '@fastify/sensible';
import multipartPlugin from './plugins/multipart';
import compilerPlugin from './plugins/compiler';
import devtoolsPlugin from './plugins/devtools';
import wssPlugin from './plugins/wss';
import { Internal, Server } from './types';
import symbolicatePlugin from './plugins/symbolicate';

/**
 * Create instance of development server, powered by Fastify.
 *
 * @param config Server configuration.
 * @returns `start` and `stop` functions as well as an underlying Fastify `instance`.
 */
export async function createServer(config: Server.Config) {
  /** Fastify instance powering the development server. */
  const instance = Fastify({
    logger: {
      level: 'trace',
      stream: new Writable({
        write: (chunk, _encoding, callback) => {
          delegate.logger.onMessage(JSON.parse(chunk.toString()));
          callback();
        },
      }),
    },
    ...(config.options.https ? { https: config.options.https } : undefined),
  });

  const delegate = config.delegate({
    log: instance.log,
    notifyBuildStart: (platform) => {
      instance.wss.dashboardServer.send({
        event: Internal.EventTypes.BuildStart,
        platform,
      });
    },
    notifyBuildEnd: (platform) => {
      instance.wss.dashboardServer.send({
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

  // Register plugins
  await instance.register(fastifySensible);
  await instance.register(wssPlugin, {
    options: config.options,
    delegate,
  });
  await instance.register(multipartPlugin);
  await instance.register(compilerPlugin, {
    delegate,
  });
  await instance.register(symbolicatePlugin, {
    delegate,
  });
  await instance.register(devtoolsPlugin, {
    options: config.options,
  });

  // await this.fastify.register(fastifyStatic, {
  //   root: path.join(__dirname, '../../first-party/debugger-ui'),
  //   prefix: '/debugger-ui',
  //   prefixAvoidTrailingSlash: true,
  // });

  instance.addHook('onSend', async (request, reply, payload) => {
    reply.header('X-Content-Type-Options', 'nosniff');

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
    await instance.listen(config.options.port, config.options.host);
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
