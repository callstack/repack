import { Writable } from 'stream';
import fastifyExpress from 'fastify-express';
import devMiddleware, { WebpackDevMiddleware } from 'webpack-dev-middleware';
import getFilenameFromUrl from 'webpack-dev-middleware/dist/utils/getFilenameFromUrl';
import webpack from 'webpack';
import { DevServerOptions } from '../types';
import { FastifyDevServer } from './types';
import { getFastifyInstance } from './utils/getFastifyInstance';
import { ReactNativeStackFrame, Symbolicator } from './Symbolicator';

export interface DevServerConfig extends DevServerOptions {}

export class DevServer {
  fastify: FastifyDevServer;
  wdm: WebpackDevMiddleware;
  symbolicator: Symbolicator;

  constructor(
    private config: DevServerConfig,
    private compiler: webpack.Compiler
  ) {
    const webpackLogger = compiler.getInfrastructureLogger('DevServer');
    const logStream = new Writable({
      write: (chunk, _encoding, callback) => {
        const data = chunk.toString();
        webpackLogger.info(data);
        callback();
      },
    });

    this.fastify = getFastifyInstance(this.config, {
      stream: logStream,
      level: 'info',
    });

    this.wdm = devMiddleware(this.compiler, {
      mimeTypes: {
        bundle: 'text/javascript',
      },
    });

    this.symbolicator = new Symbolicator(
      this.compiler.context,
      async (fileUrl) => {
        const filename = getFilenameFromUrl(this.wdm.context, fileUrl);
        if (filename) {
          const content = await new Promise<string | Buffer>(
            (resolve, reject) =>
              this.wdm.context.outputFileSystem.readFile(
                `${filename}.map`,
                (error, content) => {
                  if (error || !content) {
                    reject(error);
                  } else {
                    resolve(content);
                  }
                }
              )
          );

          return content.toString();
        } else {
          throw new Error(`Cannot infer filename from url: ${fileUrl}`);
        }
      }
    );
  }

  private setupRoutes() {
    this.fastify.addHook('onRoute', (opts) => {
      if (/(message|inspector)/.test(opts.path)) {
        // @ts-ignore
        opts.logLevel = 'silent';
      }
    });

    this.fastify.get('/', async () => {
      return { status: 'ok' };
    });

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
        this.fastify.log.error(error);
        reply.code(500).send();
      }
    });

    this.fastify.get('/message', (_request, reply) => {
      reply.code(404).send();
    });

    this.fastify.get('/inspector/device', (_request, reply) => {
      reply.code(404).send();
    });
  }

  async run() {
    try {
      await this.fastify.register(fastifyExpress);
      this.fastify.use(this.wdm);
      this.setupRoutes();

      await this.fastify.listen({
        port: this.config.port,
        host: this.config.host,
      });
      this.fastify.log.info('Dev server listening');
    } catch (error) {
      this.fastify.log.error(error);
      process.exit(1);
    }
  }
}
