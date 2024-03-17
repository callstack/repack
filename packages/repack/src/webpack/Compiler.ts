// import { Worker, SHARE_ENV } from 'worker_threads';
// import path from 'path';
// import fs from 'fs';
// import EventEmitter from 'events';
// import rspack from '@rspack/core';
// import mimeTypes from 'mime-types';
// import { SendProgress } from '@callstack/repack-dev-server';
// import type { CliOptions, StartArguments } from '../types';
// import type { LogType, Reporter } from '../logging';
// import { VERBOSE_ENV_KEY, WORKER_ENV_KEY } from '../env';
// import { adaptFilenameToPlatform } from './utils';

// export interface Asset {
//   data: string | Buffer;
//   info: Record<string, any>;
// }

// type Platform = string;

// export class Compiler extends EventEmitter {
//   workers: Record<Platform, Worker> = {};
//   assetsCache: Record<Platform, Record<string, Asset>> = {};
//   statsCache: Record<Platform, rspack.StatsCompilation> = {};
//   resolvers: Record<Platform, Array<(error?: Error) => void>> = {};
//   progressSenders: Record<Platform, SendProgress[]> = {};
//   isCompilationInProgress: Record<Platform, boolean> = {};

//   constructor(
//     private cliOptions: CliOptions,
//     private reporter: Reporter,
//     private isVerbose?: boolean
//   ) {
//     super();
//   }

//   private spawnWorker(platform: string) {
//     this.isCompilationInProgress[platform] = true;

//     const workerData = {
//       ...this.cliOptions,
//       arguments: {
//         start: {
//           ...(this.cliOptions.arguments as { start: StartArguments }).start,
//           platform,
//         },
//       },
//     };

//     process.env[WORKER_ENV_KEY] = '1';
//     process.env[VERBOSE_ENV_KEY] = this.isVerbose ? '1' : undefined;

//     const worker = new Worker(path.join(__dirname, './rspackWorker.js'), {
//       stdout: true,
//       stderr: true,
//       env: SHARE_ENV,
//       workerData,
//     });

//     const onStdChunk = (chunk: string | Buffer, fallbackType: LogType) => {
//       const data = chunk.toString().trim();
//       if (data) {
//         try {
//           const log = JSON.parse(data);
//           this.reporter.process(log);
//         } catch {
//           this.reporter.process({
//             timestamp: Date.now(),
//             type: fallbackType,
//             issuer: 'WebpackCompilerWorker',
//             message: [data],
//           });
//         }
//       }
//     };

//     worker.stdout.on('data', (chunk) => {
//       onStdChunk(chunk, 'info');
//     });

//     worker.stderr.on('data', (chunk) => {
//       onStdChunk(chunk, 'info');
//     });

//     const callPendingResolvers = (error?: Error) => {
//       this.resolvers[platform].forEach((resolver) => resolver(error));
//       this.resolvers[platform] = [];
//     };

//     worker.on(
//       'message',
//       (
//         value:
//           | { event: 'watchRun' | 'invalid' }
//           | {
//               event: 'progress';
//               total: number;
//               completed: number;
//               message: string;
//             }
//           | { event: 'error'; error: Error }
//           | {
//               event: 'done';
//               assets: Array<{
//                 filename: string;
//                 data: Uint8Array;
//                 info: Record<string, any>;
//               }>;
//               stats: rspack.StatsCompilation;
//             }
//       ) => {
//         if (value.event === 'done') {
//           this.isCompilationInProgress[platform] = false;
//           this.statsCache[platform] = value.stats;
//           this.assetsCache[platform] = value.assets.reduce(
//             (acc, { filename, data, info }) => {
//               const asset = {
//                 data: Buffer.from(data),
//                 info,
//               };
//               return {
//                 ...acc,
//                 [adaptFilenameToPlatform(filename)]: asset,
//               };
//             },
//             {}
//           );
//           callPendingResolvers();
//           this.emit(value.event, { platform, stats: value.stats });
//         } else if (value.event === 'error') {
//           this.emit(value.event, value.error);
//         } else if (value.event === 'progress') {
//           this.progressSenders[platform].forEach((sendProgress) =>
//             sendProgress({
//               total: value.total,
//               completed: value.completed,
//             })
//           );
//           this.emit(value.event, {
//             total: value.total,
//             completed: value.completed,
//             message: value.message,
//           });
//         } else {
//           // watch run
//           this.isCompilationInProgress[platform] = true;
//           this.emit(value.event, { platform });
//         }
//       }
//     );

//     worker.on('error', (error) => {
//       callPendingResolvers(error);
//     });

//     worker.on('exit', (code) => {
//       callPendingResolvers(new Error(`Worker stopped with exit code ${code}`));
//     });

//     return worker;
//   }

//   async getAsset(
//     filename: string,
//     platform: string,
//     sendProgress?: SendProgress
//   ): Promise<Asset> {
//     // Return file from assetsCache if exists
//     const fileFromCache = this.assetsCache[platform]?.[filename];
//     if (fileFromCache) {
//       return fileFromCache;
//     }

//     // Spawn new worker if not already running
//     if (!this.workers[platform]) {
//       this.workers[platform] = this.spawnWorker(platform);
//     } else if (!this.isCompilationInProgress[platform]) {
//       return Promise.reject(
//         new Error(
//           `File ${filename} for ${platform} not found in compilation assets`
//         )
//       );
//     }

//     if (sendProgress) {
//       this.progressSenders[platform] = this.progressSenders[platform] ?? [];
//       this.progressSenders[platform].push(sendProgress);
//     }
//     return await new Promise<Asset>((resolve, reject) => {
//       // Add new resolver to be executed when compilation is finished
//       this.resolvers[platform] = (this.resolvers[platform] ?? []).concat(
//         (error?: Error) => {
//           this.progressSenders[platform] = this.progressSenders[
//             platform
//           ].filter((item) => item !== sendProgress);

//           if (error) {
//             reject(error);
//           } else {
//             const fileFromCache = this.assetsCache[platform]?.[filename];
//             if (fileFromCache) {
//               resolve(fileFromCache);
//             } else {
//               reject(
//                 new Error(
//                   `File ${filename} for ${platform} not found in compilation assets`
//                 )
//               );
//             }
//           }
//         }
//       );
//     });
//   }

//   async getSource(
//     filename: string,
//     platform?: string
//   ): Promise<string | Buffer> {
//     if (/\.bundle/.test(filename) && platform) {
//       return (await this.getAsset(filename, platform)).data;
//     }

//     return fs.promises.readFile(
//       path.join(this.cliOptions.config.root, filename),
//       'utf8'
//     );
//   }

//   async getSourceMap(
//     filename: string,
//     platform: string
//   ): Promise<string | Buffer> {
//     /**
//      * Inside dev server we can control the naming of sourcemaps
//      * so there is no need to look it up, we can just assume default naming scheme
//      *
//      * TODO: add some detection for checking if the sourcemap exists
//      * We could probably check the cache directly as it should be already compiled?
//      * Or start a new compilation that will get a source map? (perf++)
//      */
//     const sourceMapFilename = filename + '.map';

//     try {
//       const sourceMap = await this.getAsset(sourceMapFilename, platform);
//       return sourceMap.data;
//     } catch {
//       throw new Error(`Source map for ${filename} for ${platform} is missing`);
//     }
//   }

//   getMimeType(filename: string) {
//     if (filename.endsWith('.bundle')) {
//       return 'text/javascript';
//     }

//     return mimeTypes.lookup(filename) || 'text/plain';
//   }
// }
