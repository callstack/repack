import path from 'path';
import execa from 'execa';
import fetch from 'node-fetch';
import getPort from 'get-port';
import fastifyGracefulShutdown from 'fastify-graceful-shutdown';
import { CliOptions, StartArguments } from '../types';
import { CLI_OPTIONS_KEY } from '../webpack/utils/parseCliOptions';
import { DevServerReply, DevServerRequest } from './types';
import { ReactNativeStackFrame, Symbolicator } from './Symbolicator';
import { BaseDevServer, BaseDevServerConfig } from './BaseDevServer';

export interface DevServerProxyConfig extends BaseDevServerConfig {}

export interface CompilerWorker {
  process: execa.ExecaChildProcess;
  port: number;
}

// TODO: use reporter and pretty-print logs
export class DevServerProxy extends BaseDevServer {
  workers: Record<string, Promise<CompilerWorker>> = {};

  constructor(config: DevServerProxyConfig, private cliOptions: CliOptions) {
    super(config, { level: 'info' });
  }

  async runWorker(platform: string) {
    if (this.workers[platform]) {
      this.fastify.log.warn('Compiler worker is already running', { platform });
      return;
    }

    const port = await getPort();
    const cliOptionsWithPlatform: CliOptions = {
      ...this.cliOptions,
      arguments: {
        start: {
          ...(this.cliOptions.arguments as { start: StartArguments }).start,
          platform,
          port,
        },
      },
    };

    this.workers[platform] = new Promise((resolve) => {
      this.fastify.log.info('Starting compiler worker', { platform, port });
      const process = execa.node(
        path.join(__dirname, './compilerWorker.js'),
        [cliOptionsWithPlatform.config.webpackConfigPath],
        {
          stdio: 'pipe',
          env: {
            [CLI_OPTIONS_KEY]: JSON.stringify(cliOptionsWithPlatform),
          },
        }
      );

      let isResolved = false;

      process.stdout?.on('data', (data) => {
        console.log('got process data on stdout', data);
      });

      process.stderr?.on('data', (data) => {
        console.log('got process data on stderr', data);
      });

      process.on('message', (data) => {
        const { event } = data as { event: 'watchRun' };
        if (event === 'watchRun') {
          if (!isResolved) {
            isResolved = true;
            resolve({
              port,
              process,
            });
          }
        }
      });
    });
  }

  async forwardRequest(
    platform: string,
    request: DevServerRequest,
    reply: DevServerReply
  ) {
    const { port } = await this.workers[platform];
    const host = request.headers[':authority'] || request.headers.host;
    const url = request.headers[':path'] || request.raw.url;
    if (!url || !host) {
      reply.code(500).send();
    } else {
      const compilerWorkerUrl = `http://localhost:${port}${url}`;
      this.fastify.log.debug(`Fetching from worker`, {
        url: compilerWorkerUrl,
        method: request.method,
        body: request.body,
      });
      const response = await fetch(compilerWorkerUrl, {
        method: request.method,
        body: typeof request.body === 'string' ? request.body : undefined,
      });
      const payload = await response.buffer();
      reply
        .type(response.headers.get('Content-Type') || 'text/plain')
        .send(payload);
    }
  }

  async setup() {
    await this.fastify.register(fastifyGracefulShutdown);
    this.fastify.gracefulShutdown(async (code, cb) => {
      for (const platform in this.workers) {
        const worker = await this.workers[platform];
        worker.process.kill(code);
      }

      this.fastify.log.info(`Shutting down dev server proxy`, {
        port: this.config.port,
        code,
      });
      cb();
    });

    await super.setup();

    this.fastify.post('/symbolicate', async (request, reply) => {
      const { stack } = JSON.parse(request.body as string) as {
        stack: ReactNativeStackFrame[];
      };
      const platform = Symbolicator.inferPlatformFromStack(stack);
      if (!platform) {
        reply.code(400).send();
      } else {
        await this.forwardRequest(platform, request, reply);
      }
    });

    this.fastify.route({
      method: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
      url: '*',
      schema: {
        querystring: {
          type: 'object',
          properties: {
            platform: {
              type: 'string',
            },
          },
        },
      },
      handler: async (request, reply) => {
        const platform = (request.query as { platform?: string } | undefined)
          ?.platform;

        if (!platform) {
          this.fastify.log.warn('Missing platform query param', {
            query: request.query,
          });
          reply.code(400).send();
        } else {
          try {
            if (this.workers[platform]) {
              await this.forwardRequest(platform, request, reply);
            } else {
              await this.runWorker(platform);
              await this.forwardRequest(platform, request, reply);
            }
          } catch (error) {
            console.error(error);
            reply.code(500).send();
          }
        }
      },
    });
  }

  async run() {
    try {
      await this.setup();
      await super.run();
      this.fastify.log.info('Dev server proxy running');
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }
}
