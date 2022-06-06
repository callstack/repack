import { Worker } from 'worker_threads';
import path from 'path';
import fs from 'fs';
import EventEmitter from 'events';
import webpack from 'webpack';
import mimeTypes from 'mime-types';
import type { CliOptions, StartArguments } from '../types';
import type { LogType, Reporter } from '../logging';
import { CLI_OPTIONS_ENV_KEY, VERBOSE_ENV_KEY, WORKER_ENV_KEY } from '../env';

export class Compiler extends EventEmitter {
  workers: Record<string, Worker> = {};
  cache: Record<string, Record<string, string | Buffer>> = {};
  resolvers: Record<string, Array<(error?: Error) => void>> = {};

  constructor(
    private cliOptions: CliOptions,
    private reporter: Reporter,
    private isVerbose?: boolean
  ) {
    super();
  }

  private spawnWorker(platform: string) {
    const workerData = {
      ...this.cliOptions,
      arguments: {
        start: {
          ...(this.cliOptions.arguments as { start: StartArguments }).start,
          platform,
        },
      },
    };

    const worker = new Worker(path.join(__dirname, './webpackWorker.js'), {
      stdout: true,
      stderr: true,
      env: {
        [CLI_OPTIONS_ENV_KEY]: JSON.stringify(workerData),
        [WORKER_ENV_KEY]: '1',
        [VERBOSE_ENV_KEY]: this.isVerbose ? '1' : undefined,
      },
      workerData,
    });

    const onStdChunk = (chunk: string | Buffer, fallbackType: LogType) => {
      const data = chunk.toString().trim();
      if (data) {
        try {
          const log = JSON.parse(data);
          this.reporter.process(log);
        } catch {
          this.reporter.process({
            timestamp: Date.now(),
            type: fallbackType,
            issuer: 'WebpackCompilerWorker',
            message: [data],
          });
        }
      }
    };

    worker.stdout.on('data', (chunk) => {
      onStdChunk(chunk, 'info');
    });

    worker.stderr.on('data', (chunk) => {
      onStdChunk(chunk, 'info');
    });

    const callPendingResolvers = (error?: Error) => {
      this.resolvers[platform].forEach((resolver) => resolver(error));
      this.resolvers[platform] = [];
    };

    worker.on(
      'message',
      (
        value:
          | { event: 'watchRun' | 'invalid' }
          | {
              event: 'done';
              assets: Array<{ filename: string; data: Uint8Array }>;
              stats: webpack.Stats;
            }
      ) => {
        if (value.event === 'done') {
          this.cache[platform] = value.assets.reduce(
            (acc, { filename, data }) => ({
              ...acc,
              [filename]: Buffer.from(data),
            }),
            {}
          );

          callPendingResolvers();
          this.emit(value.event, { platform, stats: value.stats });
        } else {
          this.emit(value.event, { platform });
        }
      }
    );

    worker.on('error', (error) => {
      callPendingResolvers(error);
    });

    worker.on('exit', (code) => {
      callPendingResolvers(new Error(`Worker stopped with exit code ${code}`));
    });

    return worker;
  }

  async getAsset(
    filename: string,
    platform: string
    // sendProgress?: SendProgress
  ): Promise<string | Buffer> {
    // Spawn new worker if not already running
    if (!this.workers[platform]) {
      this.workers[platform] = this.spawnWorker(platform);
    }

    // Return file from cache if exists
    const fileFromCache = this.cache[platform]?.[filename];
    if (fileFromCache) {
      return fileFromCache;
    }

    return new Promise<string | Buffer>((resolve, reject) => {
      // Add new resolver to be executed when compilation is finished
      this.resolvers[platform] = (this.resolvers[platform] ?? []).concat(
        (error?: Error) => {
          if (error) {
            reject(error);
          } else {
            const fileFromCache = this.cache[platform]?.[filename];
            if (fileFromCache) {
              resolve(fileFromCache);
            } else {
              reject(new Error('File not found'));
            }
          }
        }
      );
    });
  }

  async getSource(
    filename: string,
    platform?: string
  ): Promise<string | Buffer> {
    if (/\.bundle/.test(filename) && platform) {
      return this.getAsset(filename, platform);
    }

    return fs.promises.readFile(
      path.join(this.cliOptions.config.root, filename),
      'utf8'
    );
  }

  async getSourceMap(
    filename: string,
    platform: string
  ): Promise<string | Buffer> {
    return this.getAsset(filename, platform);
  }

  getMimeType(filename: string) {
    if (filename.endsWith('.bundle')) {
      return 'text/javascript';
    }

    return mimeTypes.lookup(filename) || 'text/plain';
  }
}
