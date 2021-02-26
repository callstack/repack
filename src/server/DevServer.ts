import { Writable } from 'stream';
import fastifyExpress from 'fastify-express';
import fastifyGracefulShutdown from 'fastify-graceful-shutdown';
import devMiddleware, { WebpackDevMiddleware } from 'webpack-dev-middleware';
import getFilenameFromUrl from 'webpack-dev-middleware/dist/utils/getFilenameFromUrl';
import webpack from 'webpack';
import { ReactNativeStackFrame, Symbolicator } from './Symbolicator';
import { BaseDevServer, BaseDevServerConfig } from './BaseDevServer';
import { readFileFromWdm } from './utils/readFileFromWdm';
import { transformFastifyLogToLogEntry } from './utils/transformFastifyLogToWebpackLogEntry';

export interface DevServerConfig extends BaseDevServerConfig {}

export class DevServer extends BaseDevServer {
  private static getLoggerOptions(compiler: webpack.Compiler) {
    const webpackLogger = compiler.getInfrastructureLogger('DevServer');
    const logStream = new Writable({
      write: (chunk, _encoding, callback) => {
        const data = chunk.toString();
        const logEntry = transformFastifyLogToLogEntry(data);
        webpackLogger[logEntry.type](...logEntry.message);
        callback();
      },
    });

    return { stream: logStream, level: 'info' };
  }

  wdm: WebpackDevMiddleware;
  symbolicator: Symbolicator;

  constructor(config: DevServerConfig, private compiler: webpack.Compiler) {
    super(config, DevServer.getLoggerOptions(compiler));

    this.wdm = devMiddleware(this.compiler, {
      mimeTypes: {
        bundle: 'text/javascript',
      },
    });

    this.symbolicator = new Symbolicator(
      this.compiler.context,
      this.fastify.log,
      async (fileUrl) => {
        const filename = getFilenameFromUrl(this.wdm.context, fileUrl);
        if (filename) {
          const content = await readFileFromWdm(this.wdm, filename);

          return content.toString();
        } else {
          throw new Error(`Cannot infer filename from url: ${fileUrl}`);
        }
      }
    );
  }

  async setup() {
    await this.fastify.register(fastifyExpress);
    await this.fastify.register(fastifyGracefulShutdown);
    this.fastify.gracefulShutdown((_code, cb) => {
      cb();
    });

    this.fastify.use(this.wdm);

    await super.setup();

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
  }

  async run() {
    try {
      await this.setup();
      await super.run();
      this.fastify.log.info('Dev server running');
    } catch (error) {
      this.fastify.log.error(error);
      process.exit(1);
    }
  }
}
