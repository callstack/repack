import path from 'path';
import execa from 'execa';
import fetch from 'node-fetch';
import getPort from 'get-port';
import { CliOptions, DevServerOptions, StartArguments } from '../types';
import { CLI_OPTIONS_KEY } from '../webpack/utils/parseCliOptions';
import { getFastifyInstance } from './utils/getFastifyInstance';
import { DevServerReply, DevServerRequest } from './types';

export interface DevServerProxyConfig extends DevServerOptions {}

export interface CompilerWorker {
  process: execa.ExecaChildProcess;
  port: number;
}

export class DevServerProxy {
  workers: Record<string, CompilerWorker> = {};

  constructor(private config: DevServerProxyConfig) {}

  async runWorker(platform: string, cliOptions: CliOptions) {
    if (this.workers[platform]) {
      console.error(
        `Compiler worker for platform ${platform} is already running`
      );
      return;
    }

    const port = await getPort();
    const cliOptionsWithPlatform: CliOptions = {
      ...cliOptions,
      arguments: {
        start: {
          ...(cliOptions.arguments as { start: StartArguments }).start,
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

  private async forwardRequest(
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
        // TODO: body
      });
      const payload = await response.buffer();
      reply
        .type(response.headers.get('Content-Type') || 'text/plain')
        .send(payload);
    }
  }

  async run(cliOptions: CliOptions) {
    const fastify = getFastifyInstance(this.config);

    fastify.get('/status', async () => 'packager-status:running');

    fastify.post('/symbolicate', (request, reply) => {
      // require('inspector').open(undefined, undefined, true);
      // 1. figure out platform from stack frames's file
      // 2. fetch source map
      // 3. filter out unnecessary frames https://github.com/facebook/metro/blob/a9862e66368cd177884ea1e014801fe0c57ef5d7/packages/metro/src/Server.js#L1042
      // 4. symbolicate each stack frame https://github.com/facebook/metro/blob/a9862e66368cd177884ea1e014801fe0c57ef5d7/packages/metro/src/Server/symbolicate.js#L57
      // 5. create code frame
      // 6. reply
      // debugger;
    });

    fastify.route({
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
          reply.code(400).send();
        } else {
          try {
            if (this.workers[platform]) {
              await this.forwardRequest(platform, request, reply);
            } else {
              await this.runWorker(platform, cliOptions);
              await this.forwardRequest(platform, request, reply);
            }
          } catch (error) {
            console.error(error);
            reply.code(500).send();
          }
        }
      },
    });

    try {
      await fastify.listen({
        port: this.config.port,
        host: this.config.host,
      });
      console.log('Dev server listening');
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }
}
