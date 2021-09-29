import path from 'path';
import { Writable } from 'stream';
import execa from 'execa';
import getPort from 'get-port';
import split2 from 'split2';
import fastifyStatic from 'fastify-static';
import fastifyReplyFrom from 'fastify-reply-from';
import { CliOptions, StartArguments } from '../types';
import { Reporter } from '../Reporter';
import {
  CLI_OPTIONS_ENV_KEY,
  isVerbose,
  VERBOSE_ENV_KEY,
  WORKER_ENV_KEY,
} from '../env';
import { DevServerReply, DevServerRequest } from './types';
import { ReactNativeStackFrame, Symbolicator } from './Symbolicator';
import { BaseDevServer, BaseDevServerConfig } from './BaseDevServer';
import { transformFastifyLogToLogEntry } from './utils/transformFastifyLogToWebpackLogEntry';
import { WebSocketDashboardServer } from './ws/WebSocketDashboardServer';

/**
 * {@link DevServerProxy} configuration options.
 */
export interface DevServerProxyConfig extends BaseDevServerConfig {}

/**
 * Represents a process that runs Webpack compilation and {@link DevServer}
 * via {@link DevServerPlugin}.
 */
export interface CompilerWorker {
  /** Spawned process with the Webpack compilation. */
  process: execa.ExecaChildProcess;
  /** Port on which {@link DevServer} is running. */
  port: number;
}

/**
 * Class for spawning new compiler workers for each requested platform and forwarding requests
 * to respective platform-specific {@link DevServer}.
 *
 * The overall architecture is:
 * ```
 * `DevServerProxy`
 * ├── <compiler worker platform=ios>
 * │   └── <webpack compilation>
 * │       └── `DevServerPlugin`
 * │           └── `DevServer`
 * ├── <compiler worker platform=android>
 * │   └── <webpack compilation>
 * │       └── `DevServerPlugin`
 * │           └── `DevServer`
 * └── ...
 * ```
 *
 * Each worker is lazy, meaning it will be spawned upon receiving first request from which
 * `platform` can be inferred. This would usually be a request
 * for bundle eg: `index.bundle?platform=ios&...`.
 *
 * @category Development server
 */
export class DevServerProxy extends BaseDevServer {
  private static getLoggerOptions(getReporter: () => Reporter) {
    let reporter: Reporter;
    const logStream = new Writable({
      write: (chunk, _encoding, callback) => {
        if (!reporter) {
          reporter = getReporter();
        }
        const data = chunk.toString();
        const logEntry = transformFastifyLogToLogEntry(data);
        logEntry.issuer = 'DevServerProxy';
        reporter.process(logEntry);
        callback();
      },
    });

    return { stream: logStream, level: isVerbose() ? 'debug' : 'info' };
  }

  /** Platform to worker mappings. */
  workers: Record<string, Promise<CompilerWorker> | undefined> = {};
  wsDashboardServer = this.wsRouter.registerServer(
    new WebSocketDashboardServer(this.fastify)
  );
  /** Reporter instance. */
  reporter = new Reporter({
    wsEventsServer: this.wsEventsServer,
    wsDashboardServer: this.wsDashboardServer,
  });

  /**
   * Constructs new `DevServerProxy`.
   *
   * @param config Configuration options.
   * @param cliOptions CLI options (usually provided by {@link start} command based on arguments
   * from React Native CLI.)
   */
  constructor(config: DevServerProxyConfig, private cliOptions: CliOptions) {
    super(
      config,
      DevServerProxy.getLoggerOptions(() => this.reporter)
    );
  }

  /**
   * Spawn new compiler worker for given `platform`.
   * If the worker is already running, a warning is emitted and the method stops it's execution.
   * The port on which {@link DevServer} inside worker will be running is random, so no assumptions
   * should be taken regarding the port number.
   *
   * @param platform Application platform for which to spawn new worker.
   */
  async runWorker(platform: string) {
    if (this.workers[platform]) {
      this.fastify.log.warn({
        msg: 'Compiler worker is already running',
        platform,
      });
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
      const env = {
        [CLI_OPTIONS_ENV_KEY]: JSON.stringify(cliOptionsWithPlatform),
        [WORKER_ENV_KEY]: '1',
        [VERBOSE_ENV_KEY]: isVerbose() ? '1' : undefined,
      };

      this.fastify.log.info({
        msg: 'Starting compiler worker',
        platform,
        port,
      });
      this.fastify.log.debug({
        msg: 'Compiler worker settings',
        env,
      });

      const process = execa.node(
        path.join(__dirname, './compilerWorker.js'),
        [cliOptionsWithPlatform.config.webpackConfigPath],
        {
          stdio: 'pipe',
          env,
        }
      );

      let isResolved = false;

      const onStdData = (event: string | Buffer) => {
        const data = event.toString().trim();
        if (data) {
          try {
            const logEntry = JSON.parse(data);
            this.reporter.process(logEntry);
          } catch {
            this.fastify.log.error({
              msg: 'Cannot parse compiler worker message',
              platform,
              message: data,
            });
          }
        }
      };

      process.stdout?.pipe(split2()).on('data', onStdData);
      process.stderr?.pipe(split2()).on('data', onStdData);

      process.on('message', (data) => {
        const { event } = data as { event: 'watchRun' };
        if (event === 'watchRun') {
          if (!isResolved) {
            isResolved = true;

            this.wsDashboardServer.send(
              JSON.stringify({
                kind: 'compilation',
                event: {
                  name: 'watchRun',
                  port,
                  platform,
                },
              })
            );

            resolve({
              port,
              process,
            });
          }
        }
      });
    });
  }

  /**
   * Forward request to a {@link DevServer} running inside compiler worker for the `platform`.
   *
   * @param platform Application platform.
   * @param request Request instance to forward.
   * @param reply Reply instance to send received data through.
   */
  async forwardRequest(
    platform: string,
    request: DevServerRequest,
    reply: DevServerReply
  ) {
    if (!this.workers[platform]) {
      await this.runWorker(platform);
    }

    const { port } = await (this.workers[platform] as Promise<CompilerWorker>);
    const host = request.headers[':authority'] || request.headers.host;
    const url = request.headers[':path'] || request.raw.url;
    if (!url || !host) {
      reply.code(500).send();
    } else {
      const compilerWorkerUrl = `http://localhost:${port}${url}`;
      this.fastify.log.debug({
        msg: 'Fetching from worker',
        url: compilerWorkerUrl,
        method: request.method,
        body: request.body,
      });
      reply.from(compilerWorkerUrl);
    }
  }

  /**
   * Sets up routes.
   */
  async setup() {
    // TODO: figure out if we need it
    // await this.fastify.register(fastifyGracefulShutdown);
    // this.fastify.gracefulShutdown(async (code, cb) => {
    //   for (const platform in this.workers) {
    //     const worker = await this.workers[platform];
    //     worker.process.kill(code);
    //   }

    //   this.fastify.log.info({
    //     msg: 'Shutting down dev server proxy',
    //     port: this.config.port,
    //     code,
    //   });
    //   cb();
    // });

    await super.setup();

    const dashboardPublicDir = path.join(
      __dirname,
      '../../first-party/dashboard'
    );
    await this.fastify.register(fastifyStatic, {
      root: dashboardPublicDir,
      prefix: '/dashboard',
      prefixAvoidTrailingSlash: true,
      decorateReply: false,
    });

    this.fastify.register(fastifyReplyFrom, {
      undici: {
        headersTimeout: 5 * 60 * 1000,
        bodyTimeout: 5 * 60 * 1000,
      },
    });

    this.fastify.get('/dashboard/:page', (_, reply) => {
      reply.sendFile('index.html', dashboardPublicDir);
    });

    this.fastify.get('/api/dashboard/platforms', async () => {
      const platforms = await Promise.all(
        Object.keys(this.workers).map(async (platform) => ({
          id: platform,
          port: (await this.workers[platform])?.port,
        }))
      );

      return {
        platforms,
      };
    });

    this.fastify.get('/api/dashboard/server-logs', (_, reply) => {
      reply.send({
        logs: this.reporter.getLogBuffer(),
      });
    });

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

      return reply;
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
          this.fastify.log.warn({
            msg: 'Missing platform query param',
            query: request.query,
            method: request.method,
            url: request.url,
          });
          reply.code(400).send();
        } else {
          try {
            await this.forwardRequest(platform, request, reply);
          } catch (error) {
            console.error(error);
            reply.code(500).send();
          }
        }

        return reply;
      },
    });
  }

  /**
   * Runs the proxy.
   */
  async run() {
    try {
      await this.setup();
      await super.run();
      this.fastify.log.info({
        msg: `Dashboard available at: http${this.config.https ? 's' : ''}://${
          this.config.host || 'localhost'
        }:${this.config.port}/dashboard`,
      });
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }
}
