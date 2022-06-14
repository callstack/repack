import { Worker } from 'worker_threads';
import path from 'path';
import fs from 'fs';
import EventEmitter from 'events';
import webpack from 'webpack';
import mimeTypes from 'mime-types';
import { SendProgress } from '@callstack/repack-dev-server';
import type { CliOptions, StartArguments } from '../types';
import type { LogType, Reporter } from '../logging';
import { CLI_OPTIONS_ENV_KEY, VERBOSE_ENV_KEY, WORKER_ENV_KEY } from '../env';

export interface Asset {
  data: string | Buffer;
  info: Record<string, any>;
}

type Platform = string;

export class Compiler extends EventEmitter {
  workers: Record<Platform, Worker> = {};
  cache: Record<Platform, Record<string, Asset>> = {};
  resolvers: Record<Platform, Array<(error?: Error) => void>> = {};
  progressSenders: Record<Platform, SendProgress[]> = {};
  isCompilationInProgress: Record<Platform, boolean> = {};

  constructor(
    private cliOptions: CliOptions,
    private reporter: Reporter,
    private isVerbose?: boolean
  ) {
    super();
  }

  private spawnWorker(platform: string) {
    this.isCompilationInProgress[platform] = true;

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
              event: 'progress';
              total: number;
              completed: number;
              message: string;
            }
          | { event: 'error'; error: Error }
          | {
              event: 'done';
              assets: Array<{
                filename: string;
                data: Uint8Array;
                info: Record<string, any>;
              }>;
              stats: webpack.Stats;
            }
      ) => {
        if (value.event === 'done') {
          this.isCompilationInProgress[platform] = false;
          this.cache[platform] = value.assets.reduce(
            (acc, { filename, data, info }) => ({
              ...acc,
              [filename]: {
                data: Buffer.from(data),
                info,
              },
            }),
            {}
          );
          callPendingResolvers();
          this.emit(value.event, { platform, stats: value.stats });
        } else if (value.event === 'error') {
          this.emit(value.event, value.error);
        } else if (value.event === 'progress') {
          this.progressSenders[platform].forEach((sendProgress) =>
            sendProgress({
              total: value.total,
              completed: value.completed,
            })
          );
          this.emit(value.event, {
            total: value.total,
            completed: value.completed,
            message: value.message,
          });
        } else {
          this.isCompilationInProgress[platform] = true;
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
    platform: string,
    sendProgress?: SendProgress
  ): Promise<Asset> {
    // Return file from cache if exists
    const fileFromCache = this.cache[platform]?.[filename];
    if (fileFromCache) {
      return fileFromCache;
    }

    // Spawn new worker if not already running
    if (!this.workers[platform]) {
      this.workers[platform] = this.spawnWorker(platform);
    } else if (!this.isCompilationInProgress[platform]) {
      return Promise.reject(
        `File ${filename} for ${platform} not found in compilation assets`
      );
    }

    if (sendProgress) {
      this.progressSenders[platform] = this.progressSenders[platform] ?? [];
      this.progressSenders[platform].push(sendProgress);
    }
    return new Promise<Asset>((resolve, reject) => {
      // Add new resolver to be executed when compilation is finished
      this.resolvers[platform] = (this.resolvers[platform] ?? []).concat(
        (error?: Error) => {
          this.progressSenders[platform] = this.progressSenders[
            platform
          ].filter((item) => item !== sendProgress);

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
      return (await this.getAsset(filename, platform)).data;
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
    const { info } = await this.getAsset(filename, platform);
    const sourceMapFilename = info.related?.sourceMap as string | undefined;

    if (sourceMapFilename) {
      return (await this.getAsset(sourceMapFilename, platform)).data;
    }

    return Promise.reject(
      new Error(`Source map for ${filename} for ${platform} is missing`)
    );
  }

  getMimeType(filename: string) {
    if (filename.endsWith('.bundle')) {
      return 'text/javascript';
    }

    return mimeTypes.lookup(filename) || 'text/plain';
  }
}
