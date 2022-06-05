import { Worker } from 'worker_threads';
import path from 'path';
import { URL } from 'url';
import EventEmitter from 'events';
import mimeTypes from 'mime-types';
import {
  CompilerOptions,
  SymbolicateOptions,
  EventsOptions,
  DevServerEvents,
} from '@callstack/repack-dev-server';
import type { CliOptions, StartArguments } from '../types';
import type { LogType, Reporter } from '../logging';
import { CLI_OPTIONS_ENV_KEY, VERBOSE_ENV_KEY, WORKER_ENV_KEY } from '../env';

export function getWebpackDevServerAdapter(
  cliOptions: CliOptions,
  reporter: Reporter,
  isVerbose?: boolean
): CompilerOptions & SymbolicateOptions & EventsOptions {
  const workers: Record<string, Worker> = {};
  const cache: Record<string, Record<string, string | Buffer>> = {};
  const listeners: Record<string, Array<(error?: Error) => void>> = {};
  const emitter = new EventEmitter();

  function spawnWorker(platform: string) {
    const workerData = {
      ...cliOptions,
      arguments: {
        start: {
          ...(cliOptions.arguments as { start: StartArguments }).start,
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
        [VERBOSE_ENV_KEY]: isVerbose ? '1' : undefined,
      },
      workerData,
    });

    function onStdChunk(chunk: string | Buffer, fallbackType: LogType) {
      const data = chunk.toString().trim();
      if (data) {
        try {
          const log = JSON.parse(data);
          reporter.process(log);
        } catch {
          reporter.process({
            timestamp: Date.now(),
            type: fallbackType,
            issuer: 'WebpackCompilerWorker',
            message: [data],
          });
        }
      }
    }

    worker.stdout.on('data', (chunk) => {
      onStdChunk(chunk, 'info');
    });

    worker.stderr.on('data', (chunk) => {
      onStdChunk(chunk, 'info');
    });

    function notifyListeners(error?: Error) {
      listeners[platform].forEach((listener) => listener(error));
      listeners[platform] = [];
    }

    worker.on(
      'message',
      (
        value:
          | { event: 'watchRun' | 'invalid' }
          | {
              event: 'done';
              assets: Array<{ filename: string; data: Uint8Array }>;
            }
      ) => {
        if (value.event === 'done') {
          emitter.emit(DevServerEvents.BuildEnd, platform);

          cache[platform] = value.assets.reduce(
            (acc, { filename, data }) => ({
              ...acc,
              [filename]: Buffer.from(data),
            }),
            {}
          );

          notifyListeners();
        }

        if (value.event === 'invalid' || value.event === 'watchRun') {
          emitter.emit(DevServerEvents.BuildStart, platform);
        }
      }
    );

    worker.on('error', (error) => {
      notifyListeners(error);
    });

    worker.on('exit', (code) => {
      notifyListeners(new Error(`Worker stopped with exit code ${code}`));
    });

    return worker;
  }

  function getMimeType(
    filename: string,
    _platform: string,
    _data: string | Buffer
  ) {
    if (filename.endsWith('.bundle')) {
      return 'text/javascript';
    }

    return mimeTypes.lookup(filename) || 'text/plain';
  }

  async function getAsset(
    filename: string,
    platform: string
    // sendProgress?: SendProgress
  ): Promise<string | Buffer> {
    // Spawn new worker if not already running
    if (!workers[platform]) {
      workers[platform] = spawnWorker(platform);
    }

    // Return file from cache if exists
    const fileFromCache = cache[platform]?.[filename];
    if (fileFromCache) {
      return fileFromCache;
    }

    return new Promise<string | Buffer>((resolve, reject) => {
      // Add new listener to be executed when compilation is finished
      listeners[platform] = (listeners[platform] ?? []).concat(
        (error?: Error) => {
          if (error) {
            reject(error);
          } else {
            const fileFromCache = cache[platform]?.[filename];
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

  async function getAssetFromFileUrl(fileUrl: string) {
    const { pathname: filename, searchParams } = new URL(fileUrl);
    let platform = searchParams.get('platform');
    if (!platform) {
      const [, platformOrName, name] = filename.split('.').reverse();
      if (name !== undefined) {
        platform = platformOrName;
      }
    }

    if (!platform) {
      throw new Error('Cannot infer platform for file URL');
    }

    return (await getAsset(filename, platform)).toString();
  }

  return {
    getAsset,
    getMimeType,
    getSourceFile: getAssetFromFileUrl,
    getSourceMap: getAssetFromFileUrl,
    includeFrame: (frame) => {
      // If the frame points to internal bootstrap/module system logic, skip the code frame.
      return !/webpack[/\\]runtime[/\\].+\s/.test(frame.file);
    },
    emitter,
  };
}
