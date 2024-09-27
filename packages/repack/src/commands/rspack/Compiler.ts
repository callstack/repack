import fs from 'node:fs';
import path from 'node:path';
import type { Server } from '@callstack/repack-dev-server';
import { type Configuration, rspack } from '@rspack/core';
import type {
  MultiCompiler,
  StatsCompilation,
  WatchOptions,
} from '@rspack/core';
import memfs from 'memfs';
import mimeTypes from 'mime-types';
import type { Reporter } from '../../logging';
import type { HMRMessageBody } from '../../types';
import { adaptFilenameToPlatform, getEnvOptions, loadConfig } from '../common';
import type { StartCliOptions } from '../types';
import type { CompilerAsset, MultiWatching } from './types';

export class Compiler {
  platforms: string[];
  assetsCache: Record<string, Record<string, CompilerAsset> | undefined> = {};
  statsCache: Record<string, StatsCompilation | undefined> = {};
  resolvers: Record<string, Array<(error?: Error) => void>> = {};
  isCompilationInProgress = false;
  watchOptions: WatchOptions = {};
  watching: MultiWatching | null = null;
  // late-init
  compiler!: MultiCompiler;
  filesystem!: memfs.IFs;
  devServerContext!: Server.DelegateContext;

  constructor(
    private cliOptions: StartCliOptions,
    private reporter: Reporter
  ) {
    if (cliOptions.arguments.start.platform) {
      this.platforms = [cliOptions.arguments.start.platform];
    } else {
      this.platforms = cliOptions.config.platforms;
    }
  }

  private callPendingResolvers(platform: string, error?: Error) {
    this.resolvers[platform]?.forEach((resolver) => resolver(error));
    this.resolvers[platform] = [];
  }

  setDevServerContext(ctx: Server.DelegateContext) {
    this.devServerContext = ctx;
  }

  async init() {
    const webpackEnvOptions = getEnvOptions(this.cliOptions);
    const configs = await Promise.all(
      this.platforms.map(async (platform) => {
        const env = { ...webpackEnvOptions, platform };
        const config = await loadConfig<Configuration>(
          this.cliOptions.config.bundlerConfigPath,
          env
        );

        config.name = platform;
        return config;
      })
    );

    this.compiler = rspack.rspack(configs);
    this.filesystem = memfs.createFsFromVolume(new memfs.Volume());
    // @ts-expect-error memfs is compatible enough
    this.compiler.outputFileSystem = this.filesystem;

    this.watchOptions = configs[0].watchOptions ?? {};

    this.compiler.hooks.watchRun.tap('repack:watch', () => {
      this.isCompilationInProgress = true;
      this.platforms.forEach((platform) => {
        this.devServerContext.notifyBuildStart(platform);
      });
    });

    this.compiler.hooks.invalid.tap('repack:invalid', () => {
      this.isCompilationInProgress = true;
      this.platforms.forEach((platform) => {
        this.devServerContext.notifyBuildStart(platform);
        this.devServerContext.broadcastToHmrClients(
          { action: 'building' },
          platform
        );
      });
    });

    this.compiler.hooks.done.tap('repack:done', (multiStats) => {
      const stats = multiStats.toJson({
        all: false,
        assets: true,
        children: true,
        outputPath: true,
        timings: true,
        hash: true,
        errors: true,
        warnings: true,
      });

      try {
        stats.children?.map((childStats) => {
          const platform = childStats.name!;
          this.statsCache[platform] = childStats;

          const assets = this.statsCache[platform]!.assets!;

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
              // keep old assets, discard HMR-related ones
              Object.fromEntries(
                Object.entries(this.assetsCache[platform] ?? {}).filter(
                  ([_, asset]) => !asset.info.hotModuleReplacement
                )
              )
            );
        });
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

      this.isCompilationInProgress = false;

      stats.children?.forEach((childStats) => {
        const platform = childStats.name!;
        this.callPendingResolvers(platform);
        this.devServerContext.notifyBuildEnd(platform);
        this.devServerContext.broadcastToHmrClients(
          { action: 'built', body: this.getHmrBody(platform) },
          platform
        );
      });
    });
  }

  start() {
    this.reporter.process({
      type: 'info',
      issuer: 'DevServer',
      timestamp: Date.now(),
      message: ['Starting build for platforms:', this.platforms.join(', ')],
    });

    this.watching = this.compiler.watch(this.watchOptions, (error) => {
      if (!error) return;
      this.platforms.forEach((platform) => {
        this.callPendingResolvers(platform, error);
      });
    });
  }

  async getAsset(filename: string, platform: string): Promise<CompilerAsset> {
    // Return file from assetsCache if exists
    const fileFromCache = this.assetsCache[platform]?.[filename];
    if (fileFromCache) {
      return fileFromCache;
    }

    if (!this.isCompilationInProgress) {
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
    /**
     * TODO refactor this part
     *
     * This code makes an assumption that filename ends with .bundle
     * but this can be changed by the user, so is prone to breaking
     * In reality, it's not that big a deal. This part is within a dev server
     * so we might override & enforce the format for the purpose of development
     */
    if (/\.(bundle|hot-update\.js)/.test(filename) && platform) {
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
    try {
      const { info } = await this.getAsset(filename, platform);
      let sourceMapFilename = info.related?.sourceMap;

      if (!sourceMapFilename) {
        throw new Error(
          `No source map associated with ${filename} for ${platform}`
        );
      }

      if (Array.isArray(sourceMapFilename)) {
        sourceMapFilename = sourceMapFilename[0];
      }

      const sourceMap = await this.getAsset(sourceMapFilename, platform);
      return sourceMap.data;
    } catch {
      throw new Error(`Source map for ${filename} for ${platform} is missing`);
    }
  }

  getMimeType(filename: string) {
    /**
     * TODO potentially refactor
     *
     * same as in getSource, this part is prone to breaking
     * if the user changes the filename format
     */
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
