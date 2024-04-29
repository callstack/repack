import fs from 'node:fs';
import path from 'node:path';
import memfs from 'memfs';
import mimeTypes from 'mime-types';
import {
  rspack,
  MultiCompiler as RspackMultiCompiler,
  StatsCompilation,
  WatchOptions,
} from '@rspack/core';
import type { Server, SendProgress } from '@callstack/repack-dev-server';
import type { CliOptions, HMRMessageBody } from '../types';
import type { Reporter } from '../logging';
import { VERBOSE_ENV_KEY, WORKER_ENV_KEY } from '../env';
import { adaptFilenameToPlatform, getWebpackEnvOptions } from './utils';
import { loadRspackConfig } from './loadRspackConfig';

export interface Asset {
  data: string | Buffer;
  info: Record<string, any>;
}

type MultiWatching = ReturnType<RspackMultiCompiler['watch']>;

export class MultiCompiler {
  instance!: RspackMultiCompiler;
  assetsCache: Record<string, Record<string, Asset>> = {};
  statsCache: Record<string, StatsCompilation> = {};
  resolvers: Record<string, Array<(error?: Error) => void>> = {};
  progressSenders: Record<string, SendProgress[]> = {};
  isCompilationInProgress: Record<string, boolean> = {};
  watchOptions: WatchOptions = {};
  watching: MultiWatching | null = null;

  constructor(
    private cliOptions: CliOptions,
    private reporter: Reporter,
    private isVerbose?: boolean
  ) {
    process.env[WORKER_ENV_KEY] = '1';
    process.env[VERBOSE_ENV_KEY] = this.isVerbose ? '1' : undefined;
  }

  public async initialize(ctx: Server.DelegateContext) {
    const webpackEnvOptions = getWebpackEnvOptions(this.cliOptions);

    const androidConfig = await loadRspackConfig(
      this.cliOptions.config.webpackConfigPath,
      { ...webpackEnvOptions, platform: 'android' }
    );

    const iosConfig = await loadRspackConfig(
      this.cliOptions.config.webpackConfigPath,
      { ...webpackEnvOptions, platform: 'ios' }
    );

    this.instance = rspack([androidConfig, iosConfig]);
    this.watchOptions = androidConfig.watchOptions ?? {};
    ['android', 'ios'].forEach((platform) => {
      this.configureCompilerForPlatform(ctx, platform);
    });
  }

  private getCompilerForPlatform(platform: string) {
    if (!this.instance) throw new Error('Compiler not created yet');
    return this.instance.compilers[platform === 'android' ? 0 : 1];
  }

  private callPendingResolvers(platform: string, error?: Error) {
    this.resolvers[platform]?.forEach((resolver) => resolver(error));
    this.resolvers[platform] = [];
  }

  private configureCompilerForPlatform(
    ctx: Server.DelegateContext,
    platform: string
  ) {
    const platformCompiler = this.getCompilerForPlatform(platform);
    const platformFilesystem = memfs.createFsFromVolume(new memfs.Volume());
    // @ts-expect-error memfs is compatible enough
    platformCompiler.outputFileSystem = platformFilesystem;

    platformCompiler.hooks.watchRun.tap(`compiler-${platform}`, () => {
      this.isCompilationInProgress[platform] = true;
      ctx.notifyBuildStart(platform);
    });

    platformCompiler.hooks.invalid.tap(`compiler-${platform}`, () => {
      // was true before, TBD
      this.isCompilationInProgress[platform] = true;
      ctx.notifyBuildStart(platform);
      ctx.broadcastToHmrClients({ action: 'building' }, platform);
    });

    platformCompiler.hooks.done.tap(`compiler-${platform}`, (stats) => {
      const outputDirectory = stats.compilation.outputOptions.path!;
      const assets = stats.compilation.getAssets().map((asset) => {
        const data = platformFilesystem.readFileSync(
          path.join(outputDirectory, asset.name)
        ) as Buffer;
        return { filename: asset.name, data, info: asset.info };
      });
      this.isCompilationInProgress[platform] = false;
      this.statsCache[platform] = stats.toJson({
        all: false,
        children: true,
        modules: false, // we don't need this
        timings: true,
        hash: true,
        errors: true,
        warnings: true,
      });
      this.assetsCache[platform] = assets.reduce(
        (acc, { filename, data, info }) => {
          const asset = {
            data: Buffer.from(data),
            info, // this is only used for API, and only used for size
          };
          return {
            ...acc,
            [adaptFilenameToPlatform(filename)]: asset,
          };
        },
        {}
      );
      this.callPendingResolvers(platform);
      ctx.notifyBuildEnd(platform);
      ctx.broadcastToHmrClients(
        { action: 'built', body: this.getHmrBody(platform) },
        platform
      );
    });
  }

  private startWatch() {
    // start watching
    this.watching = this.instance.watch(this.watchOptions, (error) => {
      if (!error) return;
      this.callPendingResolvers('android', error);
      this.callPendingResolvers('ios', error);
    });
  }

  async getAsset(
    filename: string,
    platform: string,
    sendProgress?: SendProgress
  ): Promise<Asset> {
    // Return file from assetsCache if exists
    const fileFromCache = this.assetsCache[platform]?.[filename];
    if (fileFromCache) {
      return fileFromCache;
    }

    // Spawn new worker if not already running
    if (!this.instance.watching) {
      this.startWatch();
    } else if (!this.isCompilationInProgress[platform]) {
      return Promise.reject(
        new Error(
          `File ${filename} for ${platform} not found in compilation assets`
        )
      );
    }

    if (sendProgress) {
      this.progressSenders[platform] = this.progressSenders[platform] ?? [];
      this.progressSenders[platform].push(sendProgress);
    }
    return await new Promise<Asset>((resolve, reject) => {
      // Add new resolver to be executed when compilation is finished
      this.resolvers[platform] = (this.resolvers[platform] ?? []).concat(
        (error?: Error) => {
          this.progressSenders[platform] = this.progressSenders[
            platform
          ].filter((item) => item !== sendProgress);

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
    /**
     * Inside dev server we can control the naming of sourcemaps
     * so there is no need to look it up, we can just assume default naming scheme
     *
     * TODO: add some detection for checking if the sourcemap exists
     * We could probably check the cache directly as it should be already compiled?
     * Or start a new compilation that will get a source map? (perf++)
     */
    const sourceMapFilename = filename + '.map';

    try {
      const sourceMap = await this.getAsset(sourceMapFilename, platform);
      return sourceMap.data;
    } catch {
      throw new Error(`Source map for ${filename} for ${platform} is missing`);
    }
  }

  getMimeType(filename: string) {
    if (filename.endsWith('.bundle')) {
      return 'text/javascript';
    }

    return mimeTypes.lookup(filename) || 'text/plain';
  }

  getHmrBody(platform: string): HMRMessageBody | null {
    const stats = this.statsCache[platform];
    if (!stats) {
      return null;
    }

    return {
      name: stats.name ?? '',
      time: stats.time ?? 0,
      hash: stats.hash ?? '',
      warnings: stats.warnings || [],
      errors: stats.errors || [],
    };
  }
}
