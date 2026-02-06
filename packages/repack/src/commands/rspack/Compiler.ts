import fs from 'node:fs';
import path from 'node:path';
import type { SendProgress, Server } from '@callstack/repack-dev-server';
import { rspack } from '@rspack/core';
import type {
  MultiCompiler,
  MultiRspackOptions,
  Compiler as RspackCompiler,
  StatsCompilation,
} from '@rspack/core';
import memfs from 'memfs';
import { CLIError, adaptFilenameToPlatform } from '../../helpers/index.js';
import type { Reporter } from '../../logging/types.js';
import type { HMRMessage } from '../../types.js';
import { runAdbReverse } from '../common/index.js';
import { DEV_SERVER_ASSET_TYPES } from '../consts.js';
import type { CompilerAsset } from './types.js';

export class Compiler {
  compiler: MultiCompiler;
  filesystem: memfs.IFs;
  platforms: string[];
  assetsCache: Record<string, Record<string, CompilerAsset> | undefined> = {};
  statsCache: Record<string, StatsCompilation | undefined> = {};
  resolvers: Record<string, Array<(error?: Error) => void>> = {};
  progressSenders: Record<string, SendProgress[]> = {};
  isCompilationInProgress: Record<string, boolean> = {};
  // late-init
  devServerContext!: Server.DelegateContext;

  private watchRunGates: Map<string, () => void> = new Map();
  private activePlatforms: Set<string> = new Set();
  private buildStartTime: Record<string, number> = {};

  constructor(
    configs: MultiRspackOptions,
    private reporter: Reporter,
    private rootDir: string
  ) {
    const handler = (platform: string, value: number) => {
      // Skip progress for platforms not yet activated
      if (!this.activePlatforms.has(platform)) return;

      const percentage = Math.floor(value * 100);
      this.progressSenders[platform]?.forEach((sendProgress) => {
        sendProgress({ completed: percentage, total: 100 });
      });

      reporter.process({
        issuer: 'DevServer',
        message: [{ progress: { platform, value } }],
        timestamp: Date.now(),
        type: 'progress',
      });
    };

    configs.forEach((config) => {
      config.plugins?.push(
        new rspack.ProgressPlugin((percentage) =>
          handler(config.name as string, percentage)
        )
      );
    });

    this.compiler = rspack.rspack(configs);
    this.platforms = configs.map((config) => config.name as string);
    this.filesystem = memfs.createFsFromVolume(new memfs.Volume());
    // @ts-expect-error memfs is compatible enough
    this.compiler.outputFileSystem = this.filesystem;

    this.setupCompilerHooks();
  }

  get devServerOptions() {
    return this.compiler.compilers[0].options.devServer ?? {};
  }

  get watchOptions() {
    return this.compiler.compilers[0].options.watchOptions ?? {};
  }

  private callPendingResolvers(platform: string, error?: Error) {
    this.resolvers[platform]?.forEach((resolver) => resolver(error));
    this.resolvers[platform] = [];
  }

  private addProgressSender(platform: string, callback?: SendProgress) {
    if (!callback) return;
    this.progressSenders[platform] = this.progressSenders[platform] ?? [];
    this.progressSenders[platform].push(callback);
  }

  private removeProgressSender(platform: string, callback?: SendProgress) {
    if (!callback) return;
    this.progressSenders[platform] = this.progressSenders[platform].filter(
      (item) => item !== callback
    );
  }

  setDevServerContext(ctx: Server.DelegateContext) {
    this.devServerContext = ctx;
  }

  private setupCompilerHooks() {
    for (const childCompiler of this.compiler.compilers) {
      const platform = childCompiler.options.name!;
      this.setupChildCompilerHooks(platform, childCompiler);
    }
  }

  private setupChildCompilerHooks(
    platform: string,
    childCompiler: RspackCompiler
  ) {
    // Gate: hold unrequested platforms at watchRun
    childCompiler.hooks.watchRun.tapAsync('repack:gate', (_compiler, done) => {
      if (this.activePlatforms.has(platform)) {
        done();
      } else {
        this.watchRunGates.set(platform, done);
      }
    });

    // Notify build start only for active platforms
    childCompiler.hooks.watchRun.tap('repack:watch', () => {
      if (!this.activePlatforms.has(platform)) return;

      // Fix: #go() set startTime and lastWatcherStartTime at server startup
      // (before the gate held). After gate release the stale values cause
      // _done() to create a watcher that sees phantom file changes since
      // server start, triggering a spurious rebuild. Resetting both here
      // is safe for non-gated rebuilds too — #go() set them moments before
      // watchRun fired.
      if (childCompiler.watching) {
        childCompiler.watching.startTime = Date.now();
        childCompiler.watching.lastWatcherStartTime = Date.now();
      }

      this.isCompilationInProgress[platform] = true;
      this.buildStartTime[platform] = Date.now();

      if (platform === 'android') {
        void runAdbReverse({
          port: this.devServerContext.options.port,
          logger: this.devServerContext.log,
        });
      }

      this.devServerContext.notifyBuildStart(platform);
      this.devServerContext.broadcastToHmrClients<HMRMessage>({
        action: 'compiling',
        body: { name: platform },
      });
    });

    childCompiler.hooks.invalid.tap('repack:invalid', () => {
      if (!this.activePlatforms.has(platform)) return;

      this.isCompilationInProgress[platform] = true;
      this.devServerContext.notifyBuildStart(platform);
      this.devServerContext.broadcastToHmrClients<HMRMessage>({
        action: 'compiling',
        body: { name: platform },
      });
    });

    childCompiler.hooks.done.tap('repack:done', (stats) => {
      const buildEndTime = Date.now();
      const childStats = stats.toJson({
        all: false,
        assets: true,
        outputPath: true,
        timings: true,
        hash: true,
        errors: true,
        warnings: true,
      });

      const previousHash = this.statsCache[platform]?.hash;

      try {
        this.devServerContext.broadcastToHmrClients<HMRMessage>({
          action: 'hash',
          body: { name: platform, hash: childStats.hash },
        });

        this.statsCache[platform] = childStats;
        const assets = childStats.assets!;

        this.assetsCache[platform] = assets
          .filter((asset) => asset.type === 'asset')
          .reduce(
            (acc, { name, info, size }) => {
              const assetPath = path.join(childStats.outputPath!, name);
              const data = this.filesystem.readFileSync(assetPath) as Buffer;
              const asset = { data, info, size };

              acc[adaptFilenameToPlatform(name)] = asset;

              if (info.related?.sourceMap) {
                const sourceMapName = Array.isArray(info.related.sourceMap)
                  ? info.related.sourceMap[0]
                  : info.related.sourceMap;
                const sourceMapPath = path.join(
                  childStats.outputPath!,
                  sourceMapName
                );
                const sourceMapData = this.filesystem.readFileSync(
                  sourceMapPath
                ) as Buffer;
                const sourceMapAsset = {
                  data: sourceMapData,
                  info: {
                    hotModuleReplacement: info.hotModuleReplacement,
                    size: sourceMapData.length,
                  },
                  size: sourceMapData.length,
                };

                acc[adaptFilenameToPlatform(sourceMapName)] = sourceMapAsset;
              }

              return acc;
            },
            // keep old assets
            this.assetsCache[platform] ?? {}
          );
      } catch (error) {
        this.reporter.process({
          type: 'error',
          issuer: 'DevServer',
          timestamp: Date.now(),
          message: [
            'An error occured while processing assets from compilation:',
            String(error),
          ],
        });
      }

      this.isCompilationInProgress[platform] = false;
      this.callPendingResolvers(platform);

      this.devServerContext.notifyBuildEnd(platform);
      this.devServerContext.broadcastToHmrClients<HMRMessage>({
        action: 'ok',
        body: { name: platform },
      });
      if (childStats.hash !== previousHash) {
        const time = buildEndTime - this.buildStartTime[platform];
        this.reporter.process({
          issuer: 'DevServer',
          message: [{ progress: { platform, time } }],
          timestamp: Date.now(),
          type: 'progress',
        });
      }
    });
  }

  private activatePlatform(platform: string) {
    if (this.activePlatforms.has(platform)) return;
    this.activePlatforms.add(platform);
    this.isCompilationInProgress[platform] = true;

    const gate = this.watchRunGates.get(platform);
    if (gate) {
      this.watchRunGates.delete(platform);
      gate();
    }
  }

  start() {
    this.compiler.watch(this.watchOptions, (error) => {
      if (!error) return;
      this.platforms.forEach((platform) => {
        this.callPendingResolvers(platform, error);
      });
    });
  }

  close(callback?: () => void) {
    // Release all held gates so Watching instances can complete and close cleanly
    for (const [, gate] of this.watchRunGates) {
      gate();
    }
    this.watchRunGates.clear();
    this.compiler.close(callback ?? (() => {}));
  }

  async getAsset(
    filename: string,
    platform: string,
    sendProgress?: SendProgress
  ): Promise<CompilerAsset> {
    // Activate compiler for this platform on first request
    this.activatePlatform(platform);

    // Return file from assetsCache if exists
    const fileFromCache = this.assetsCache[platform]?.[filename];
    if (fileFromCache) {
      return fileFromCache;
    }

    this.addProgressSender(platform, sendProgress);

    if (!this.isCompilationInProgress[platform]) {
      this.removeProgressSender(platform, sendProgress);
      return Promise.reject(
        new Error(
          `File ${filename} for ${platform} not found in compilation assets (no compilation in progress)`
        )
      );
    }

    return await new Promise<CompilerAsset>((resolve, reject) => {
      // Add new resolver to be executed when compilation is finished
      this.resolvers[platform] = (this.resolvers[platform] ?? []).concat(
        (error?: Error) => {
          this.removeProgressSender(platform, sendProgress);
          if (error) {
            reject(error);
          } else {
            const fileFromCache = this.assetsCache[platform]?.[filename];
            if (fileFromCache) {
              resolve(fileFromCache);
            } else {
              reject(
                new Error(
                  `File ${filename} for ${platform} not found in compilation assets`
                )
              );
            }
          }
        }
      );
    });
  }

  async getSource(
    filename: string,
    platform: string | undefined,
    sendProgress?: SendProgress
  ): Promise<string | Buffer> {
    if (DEV_SERVER_ASSET_TYPES.test(filename)) {
      if (!platform) {
        throw new CLIError(`Cannot detect platform for ${filename}`);
      }
      const asset = await this.getAsset(filename, platform, sendProgress);
      return asset.data;
    }

    try {
      const filePath = path.isAbsolute(filename)
        ? filename
        : path.join(this.rootDir, filename);
      const source = await fs.promises.readFile(filePath, 'utf8');
      return source;
    } catch {
      throw new CLIError(`File ${filename} not found`);
    }
  }

  async getSourceMap(
    filename: string,
    platform: string | undefined
  ): Promise<string | Buffer> {
    if (!platform) {
      throw new CLIError(
        `Cannot determine platform for source map of ${filename}`
      );
    }

    try {
      const { info } = await this.getAsset(filename, platform);
      let sourceMapFilename = info.related?.sourceMap;

      if (!sourceMapFilename) {
        throw new CLIError(
          `Cannot determine source map filename for ${filename} for ${platform}`
        );
      }

      if (Array.isArray(sourceMapFilename)) {
        sourceMapFilename = sourceMapFilename[0];
      }

      const sourceMap = await this.getAsset(sourceMapFilename, platform);
      return sourceMap.data;
    } catch {
      throw new CLIError(
        `Source map for ${filename} for ${platform} is missing`
      );
    }
  }
}
