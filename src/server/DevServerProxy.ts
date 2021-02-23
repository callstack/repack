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

    if (this.workers[platform]) {
      console.error(
        `Compiler worker for platform ${platform} is already running`
      );
    } else {
      this.workers[platform] = { process, port };
    }

    // TODO: await compilation results via IPC
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
      console.log(response.headers.get('Content-Type'), payload.length);
      reply
        .type(response.headers.get('Content-Type') || 'text/plain')
        .send(payload);
    }
  }

  async run(cliOptions: CliOptions) {
    const fastify = getFastifyInstance(this.config);

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
