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
  workers: Record<string, CompilerWorker> = {};

  constructor(config: DevServerProxyConfig, private cliOptions: CliOptions) {
    super(config);
  }

  async runWorker(platform: string) {
    if (this.workers[platform]) {
      console.error(
        `Compiler worker for platform ${platform} is already running`
      );
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

    await new Promise<void>((resolve) => {
      const process = execa.node(
        path.join(__dirname, './compilerWorker.js'),
        [cliOptionsWithPlatform.config.webpackConfigPath],
        {
          stdio: 'inherit',
          env: {
            [CLI_OPTIONS_KEY]: JSON.stringify(cliOptionsWithPlatform),
          },
        }
      );

      let isResolved = false;

      process.on('message', (data) => {
        const { event } = data as { event: 'watchRun' };
        if (event === 'watchRun') {
          if (!isResolved) {
            isResolved = true;
            resolve();
          }
        }
      });

      this.workers[platform] = { process, port };
    });
  }

  async forwardRequest(
    platform: string,
    request: DevServerRequest,
    reply: DevServerReply
  ) {
    const { port } = this.workers[platform];
    const host = request.headers[':authority'] || request.headers.host;
    const url = request.headers[':path'] || request.raw.url;
    if (!url || !host) {
      reply.code(500).send();
    } else {
      // TODO: better logging
      const compilerWorkerUrl = `http://localhost:${port}${url}`;
      console.log(`Fetching: ${compilerWorkerUrl}`);
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
    this.fastify.gracefulShutdown((code, cb) => {
      for (const platform in this.workers) {
        const worker = this.workers[platform];
        worker.process.kill(code);
      }

      console.log(`Shutting down dev server proxy`, {
        port: this.config.port,
        code,
      });
      cb();
    });

    await super.setup();

    this.fastify.post('/symbolicate', (request, reply) => {
      const { stack } = JSON.parse(request.body as string) as {
        stack: ReactNativeStackFrame[];
      };
      const platform = Symbolicator.inferPlatformFromStack(stack);
      if (!platform) {
        reply.code(400).send();
      } else {
        this.forwardRequest(platform, request, reply);
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
        // TODO: add debug logging
        const platform = (request.query as { platform?: string } | undefined)
          ?.platform;
        if (!platform) {
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
      console.log('Dev server listening');
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }
}
