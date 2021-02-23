import {
  Http2SecureServer,
  Http2ServerRequest,
  Http2ServerResponse,
} from 'http2';
import path from 'path';
import { Server } from 'http';
import { Writable } from 'stream';
import Fastify, { FastifyInstance } from 'fastify';
import fastifyExpress from 'fastify-express';
import devMiddleware, { WebpackDevMiddleware } from 'webpack-dev-middleware';
import webpack from 'webpack';
import { DevServerOptions } from '../../../types';

export interface DevServerConfig extends DevServerOptions {}

export class DevServer {
  fastify: FastifyInstance<
    Http2SecureServer | Server,
    Http2ServerRequest,
    Http2ServerResponse
  >;
  wdm: WebpackDevMiddleware;

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
    const logger = { stream: logStream, level: 'info' };

    if (this.config.https && this.config.cert && this.config.key) {
      // @ts-ignore
      this.fastify = Fastify({
        logger,
        https: { cert: this.config.cert, key: this.config.key },
      });
    } else {
      // @ts-ignore
      this.fastify = Fastify({
        logger,
      });
    }

    this.wdm = devMiddleware(this.compiler);
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

    this.fastify.get(
      '/index.bundle',
      {
        schema: {
          querystring: {
            type: 'object',
            required: ['platform'],
            properties: {
              platform: {
                type: 'string',
              },
              minify: {
                type: 'boolean',
              },
              dev: {
                type: 'boolean',
              },
            },
          },
        },
      },
      async (request, reply) => {
        const query = request.query as { platform: string };
        const filename = path.join(
          this.compiler.outputPath,
          `index.${query.platform}.bundle`
        );
        try {
          const bundle = await new Promise<string | Buffer | undefined>(
            (resolve, reject) =>
              this.wdm.context.outputFileSystem.readFile(
                filename,
                (error, file) => {
                  if (error) {
                    reject(error);
                  } else {
                    resolve(file);
                  }
                }
              )
          );

          if (!bundle) {
            throw null;
          }

          reply.type('text/javascript').send(bundle);
        } catch {
          reply.code(404).send({
            message: `Bundle not found at ${filename}`,
          });
        }
      }
    );

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
