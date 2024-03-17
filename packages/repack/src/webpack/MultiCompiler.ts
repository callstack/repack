import path from 'path';
import fs from 'fs';
import EventEmitter from 'events';
import memfs from 'memfs';
import {
  rspack,
  MultiCompiler as RspackMultiCompiler,
  StatsCompilation,
  WatchOptions,
} from '@rspack/core';
import mimeTypes from 'mime-types';
import { SendProgress } from '@callstack/repack-dev-server';
import type { CliOptions } from '../types';
import type { Reporter } from '../logging';
import { VERBOSE_ENV_KEY, WORKER_ENV_KEY } from '../env';
import { adaptFilenameToPlatform, getWebpackEnvOptions } from './utils';
import { loadRspackConfig } from './loadRspackConfig';

export interface Asset {
  data: string | Buffer;
  info: Record<string, any>;
}

type Platform = string;

export class MultiCompiler extends EventEmitter {
  instance!: RspackMultiCompiler;
  assetsCache: Record<Platform, Record<string, Asset>> = {};
  statsCache: Record<Platform, StatsCompilation> = {};
  resolvers: Record<Platform, Array<(error?: Error) => void>> = {};
  progressSenders: Record<Platform, SendProgress[]> = {};
  isCompilationInProgress: Record<Platform, boolean> = {};
  watchOptions: Record<Platform, WatchOptions> = {};

  constructor(
    private cliOptions: CliOptions,
    private reporter: Reporter,
    private isVerbose?: boolean
  ) {
    super();
    process.env[WORKER_ENV_KEY] = '1';
    process.env[VERBOSE_ENV_KEY] = this.isVerbose ? '1' : undefined;
  }

  public async createCompiler() {
    const webpackEnvOptions = getWebpackEnvOptions(this.cliOptions);

    const androidConfig = await loadRspackConfig(
      this.cliOptions.config.webpackConfigPath,
      { ...webpackEnvOptions, platform: 'android' }
    );
    this.watchOptions['android'] = androidConfig.watchOptions ?? {};

    const iosConfig = await loadRspackConfig(
      this.cliOptions.config.webpackConfigPath,
      { ...webpackEnvOptions, platform: 'ios' }
    );
    this.watchOptions['ios'] = iosConfig.watchOptions ?? {};

    this.instance = rspack([androidConfig, iosConfig]);
  }

  private getCompilerForPlatform(platform: string) {
    if (!this.instance) throw new Error('Compiler not created yet');
    return this.instance.compilers[platform === 'android' ? 0 : 1];
  }

  private callPendingResolvers(platform: string, error?: Error) {
    this.resolvers[platform].forEach((resolver) => resolver(error));
    this.resolvers[platform] = [];
  }

  private startWatch(platform: string) {
    const platformCompiler = this.getCompilerForPlatform(platform);
    const platformFilesystem = memfs.createFsFromVolume(new memfs.Volume());

    // @ts-expect-error memfs is compatible enough
    platformCompiler.outputFileSystem = platformFilesystem;

    platformCompiler.hooks.watchRun.tap(`compiler-${platform}`, () => {
      this.isCompilationInProgress[platform] = true;
      this.emit('watchRun', { platform });
    });

    platformCompiler.hooks.invalid.tap(`compiler-${platform}`, () => {
      // was true before, TBD
      this.isCompilationInProgress[platform] = false;
      this.emit('invalid', { platform });
    });

    platformCompiler.hooks.done.tap(`compiler-${platform}`, (stats) => {
      const outputDirectory = stats.compilation.outputOptions.path!;
      const assets = stats.compilation.getAssets().map((asset) => {
        const data = platformFilesystem.readFileSync(
          path.join(outputDirectory, asset.name)
        ) as Buffer;
        return {
          filename: asset.name,
          data,
          info: asset.info,
        };
      });

      this.isCompilationInProgress[platform] = false;
      this.statsCache[platform] = stats.toJson({
        all: false,
        children: true,
        modules: true,
        timings: true,
        hash: true,
        errors: true,
        warnings: true,
      });
      this.assetsCache[platform] = assets.reduce(
        (acc, { filename, data, info }) => {
          const asset = {
            data: Buffer.from(data),
            info,
          };
          return {
            ...acc,
            [adaptFilenameToPlatform(filename)]: asset,
          };
        },
        {}
      );
      this.callPendingResolvers(platform);
      this.emit('done', { platform, stats: this.statsCache[platform] });
    });

    // start watching
    platformCompiler.watch(this.watchOptions[platform], (error) => {
      if (!error) return;
      this.callPendingResolvers(platform, error);
      this.emit('error', error);
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
    const platformCompiler = this.getCompilerForPlatform(platform);
    if (!platformCompiler.watching) {
      this.startWatch(platform);
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
}
