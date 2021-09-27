import { Writable } from 'stream';
import path from 'path';
import fastifyExpress from 'fastify-express';
import devMiddleware, { WebpackDevMiddleware } from 'webpack-dev-middleware';
import getFilenameFromUrl from 'webpack-dev-middleware/dist/utils/getFilenameFromUrl';
import webpack from 'webpack';
import { isVerbose } from '../env';
import { ReactNativeStackFrame, Symbolicator } from './Symbolicator';
import { BaseDevServer, BaseDevServerConfig } from './BaseDevServer';
import { readFileFromWdm } from './utils/readFileFromWdm';
import { transformFastifyLogToLogEntry } from './utils/transformFastifyLogToWebpackLogEntry';
import { WebSocketHMRServer } from './ws';
import { DevServerLoggerOptions } from './types';
import { WebSocketDashboardServer } from './ws/WebSocketDashboardServer';

/**
 * {@link DevServer} configuration options.
 */
export interface DevServerConfig extends BaseDevServerConfig {}

/**
 * Class for setting up and running development server for React Native application.
 * It's usually created by the {@link DevServerPlugin}.
 *
 * Each `DevServer` instance is platform-specific, for example for `ios` and `android` platforms,
 * you need 2 `DevServer` running (on different ports). Alternatively you can
 * use {@link DevServerProxy} to spawn new processes with Webpack compilations for each platform.
 *
 * @category Development server
 */
export class DevServer extends BaseDevServer {
  private static getLoggerOptions(
    compiler: webpack.Compiler,
    platform: string
  ): DevServerLoggerOptions {
    const webpackLogger = compiler.getInfrastructureLogger(
      `DevServer@${platform}`
    );
    const logStream = new Writable({
      write: (chunk, _encoding, callback) => {
        const data = chunk.toString();
        const logEntry = transformFastifyLogToLogEntry(data);
        webpackLogger[logEntry.type](...logEntry.message);
        callback();
      },
    });

    return { stream: logStream, level: isVerbose() ? 'debug' : 'info' };
  }

  /** [webpack-dev-middleware](https://github.com/webpack/webpack-dev-middleware) instance. */
  wdm: WebpackDevMiddleware;
  /** HMR WebSocket server instance to allow HMR clients to receive updates. */
  hmrServer: WebSocketHMRServer;
  /** TODO */
  wsDashboardServer: WebSocketDashboardServer;
  /** Symbolicator instance to transform stack traces using Source Maps. */
  symbolicator: Symbolicator;

  /**
   * Constructs new `DevServer` instance.
   *
   * @param config Configuration options.
   * @param compiler Webpack compiler instance.
   */
  constructor(config: DevServerConfig, private compiler: webpack.Compiler) {
    super(config, DevServer.getLoggerOptions(compiler, config.platform));

    this.wdm = devMiddleware(this.compiler, {
      mimeTypes: {
        bundle: 'text/javascript',
      },
    });

    this.hmrServer = this.wsRouter.registerServer(
      new WebSocketHMRServer(this.fastify, {
        compiler: this.compiler,
      })
    );

    this.wsDashboardServer = this.wsRouter.registerServer(
      new WebSocketDashboardServer(this.fastify, { compiler: this.compiler })
    );

    this.symbolicator = new Symbolicator(
      this.compiler.context,
      this.fastify.log,
      async (fileUrl) => {
        const filename = getFilenameFromUrl(this.wdm.context, fileUrl);
        if (filename) {
          return (await readFileFromWdm(this.wdm, filename)).toString();
        } else {
          throw new Error(`Cannot infer filename from url: ${fileUrl}`);
        }
      },
      async (fileUrl) => {
        const filename = getFilenameFromUrl(this.wdm.context, fileUrl);
        if (filename) {
          const fallbackSourceMapFilename = `${filename}.map`;
          const bundle = (await readFileFromWdm(this.wdm, filename)).toString();
          const [, sourceMappingUrl] = /sourceMappingURL=(.+)$/.exec(
            bundle
          ) || [undefined, undefined];
          const [sourceMapBasename] = sourceMappingUrl?.split('?') ?? [
            undefined,
          ];

          let sourceMapFilename = fallbackSourceMapFilename;
          if (sourceMapBasename) {
            sourceMapFilename = path.join(
              path.dirname(filename),
              sourceMapBasename
            );
          }

          try {
            const sourceMap = await readFileFromWdm(
              this.wdm,
              sourceMapFilename
            );
            return sourceMap.toString();
          } catch {
            this.fastify.log.warn({
              msg: 'Failed to read source map from sourceMappingURL, trying fallback',
              sourceMappingUrl,
              sourceMapFilename,
            });
            const sourceMap = await readFileFromWdm(
              this.wdm,
              fallbackSourceMapFilename
            );
            return sourceMap.toString();
          }
        } else {
          throw new Error(`Cannot infer filename from url: ${fileUrl}`);
        }
      }
    );
  }

  /**
   * Sets up Fastify plugins and routes.
   */
  async setup() {
    await super.setup();

    await this.fastify.register(fastifyExpress);
    this.fastify.use(this.wdm);

    this.fastify.post('/symbolicate', async (request, reply) => {
      try {
        const { stack } = JSON.parse(request.body as string) as {
          stack: ReactNativeStackFrame[];
        };
        const platform = Symbolicator.inferPlatformFromStack(stack);
        if (!platform) {
          reply.code(400).send();
        } else {
          const results = await this.symbolicator.process(stack);
          reply.send(results);
        }
      } catch (error) {
        this.fastify.log.error({
          msg: 'Failed to symbolicate',
          error: (error as Error).message,
        });
        reply.code(500).send();
      }
    });

    let lastStats: webpack.Stats | undefined;
    this.compiler.hooks.done.tap('DevServer', (stats) => {
      lastStats = stats;
    });
    this.fastify.get('/api/dashboard/stats', (_, reply) => {
      if (lastStats)
        reply.send(
          lastStats.toJson({
            preset: 'summary',
            assets: true,
            builtAt: true,
            chunks: true,
            chunkModules: false,
            errors: true,
            warnings: true,
            timings: true,
          })
        );
      else {
        reply.code(404).send();
      }
    });
  }

  /**
   * Runs development server.
   */
  async run() {
    try {
      await this.setup();
      await super.run();
    } catch (error) {
      this.fastify.log.error(error);
      process.exit(1);
    }
  }
}
