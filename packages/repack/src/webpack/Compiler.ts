import fs from 'node:fs';
import path from 'node:path';
import memfs from 'memfs';
import mimeTypes from 'mime-types';
import rspack from '@rspack/core';
import type { Server } from '@callstack/repack-dev-server';
import type { Reporter } from '../logging';
import type { StartCliOptions, HMRMessageBody } from '../types';
import { loadConfig } from './loadConfig';
import type { CompilerAsset, MultiWatching } from './types';
import { adaptFilenameToPlatform, getEnvOptions } from './utils';

export class Compiler {
  instance!: rspack.MultiCompiler;
  platforms: string[];
  assetsCache: Record<string, Record<string, CompilerAsset> | undefined> = {};
  statsCache: Record<string, rspack.StatsCompilation | undefined> = {};
  resolvers: Record<string, Array<(error?: Error) => void>> = {};
  isCompilationInProgress: Record<string, boolean> = {};
  watchOptions: rspack.WatchOptions = {};
  watching: MultiWatching | null = null;

  constructor(
    private cliOptions: StartCliOptions,
    private reporter: Reporter
  ) {
    // TODO validate platforms?
    this.platforms = cliOptions.arguments.start.platforms;
  }

  private getCompilerForPlatform(platform: string) {
    if (!this.instance) {
      throw new Error('[Compiler] Compiler not created yet');
    }

    const index = this.platforms.indexOf(platform);
    if (index === -1) {
      throw new Error(`[Compiler] Platform ${platform} not found`);
    }

    const compiler = this.instance.compilers[index];
    if (!compiler) {
      throw new Error(`[Compiler] Compiler for ${platform} not found`);
    }

    return compiler;
  }

  private callPendingResolvers(platform: string, error?: Error) {
    this.resolvers[platform]?.forEach((resolver) => resolver(error));
    this.resolvers[platform] = [];
  }

  private configureCompilerForPlatform(
    ctx: Server.DelegateContext,
    platform: string
  ) {
    const internalName = `${platform}-compiler`;
    const platformCompiler = this.getCompilerForPlatform(platform);
    const platformFilesystem = memfs.createFsFromVolume(new memfs.Volume());

    // @ts-expect-error memfs is compatible enough
    platformCompiler.outputFileSystem = platformFilesystem;
    platformCompiler.name = platform;

    platformCompiler.hooks.watchRun.tap(internalName, () => {
      this.isCompilationInProgress[platform] = true;
      ctx.notifyBuildStart(platform);
    });

    platformCompiler.hooks.invalid.tap(internalName, () => {
      this.isCompilationInProgress[platform] = true;
      ctx.notifyBuildStart(platform);
      ctx.broadcastToHmrClients({ action: 'building' }, platform);
    });

    platformCompiler.hooks.done.tap(internalName, (stats) => {
      this.statsCache[platform] = stats.toJson({
        all: false,
        assets: true,
        children: true,
        timings: true,
        hash: true,
        errors: true,
        warnings: true,
      });
      const outputDirectory = stats.compilation.outputOptions.path!;
      const assets = this.statsCache[platform]!.assets!;

      this.assetsCache[platform] = assets.reduce(
        (acc, { name, info, size }) => {
          const assetPath = path.join(outputDirectory, name);
          const data = platformFilesystem.readFileSync(assetPath) as Buffer;
          const asset = { data, info, size };
          return Object.assign(acc, { [adaptFilenameToPlatform(name)]: asset });
        },
        // keep old assets, discard HMR-related ones
        Object.fromEntries(
          Object.entries(this.assetsCache[platform] ?? {}).filter(
            ([_, asset]) => !asset.info.hotModuleReplacement
          )
        )
      );

      this.isCompilationInProgress[platform] = false;
      this.callPendingResolvers(platform);

      ctx.notifyBuildEnd(platform);
      ctx.broadcastToHmrClients(
        { action: 'built', body: this.getHmrBody(platform) },
        platform
      );
    });
  }

  async init(ctx: Server.DelegateContext) {
    const webpackEnvOptions = getEnvOptions(this.cliOptions);
    const configs = await Promise.all(
      this.platforms.map((platform) => {
        const env = { ...webpackEnvOptions, platform };
        return loadConfig(this.cliOptions.config.webpackConfigPath, env);
      })
    );

    this.instance = rspack.rspack(configs);
    this.watchOptions = configs[0].watchOptions ?? {};
    this.platforms.forEach((platform) => {
      this.configureCompilerForPlatform(ctx, platform);
    });

    this.instance.hooks.done.tap('Compiler', (multiStats) => {
      const issuer = 'DevServer';
      const timestamp = Date.now();
      const {
        children = [],
        errors = [],
        warnings = [],
      } = multiStats.toJson({
        preset: 'errors-warnings',
        timings: true,
      });

      if (errors.length) {
        const message = ['Bundle built with erros'];
        this.reporter.process({ type: 'error', issuer, timestamp, message });

        children.forEach((stats) => {
          stats.errors?.forEach((error) => {
            const message = [
              `Error in "${error.moduleName}":\n${error.formatted}`,
            ];
            this.reporter.process({
              type: 'error',
              issuer,
              timestamp,
              message,
            });
          });
        });
      } else if (warnings?.length) {
        const message = ['Bundle built with warnings'];
        this.reporter.process({ type: 'warn', issuer, timestamp, message });

        children.forEach((stats) => {
          stats.warnings?.forEach((warning) => {
            const message = [
              `Warning in "${warning.moduleName}": ${warning.message}`,
            ];
            this.reporter.process({ type: 'warn', issuer, timestamp, message });
          });
        });
      } else {
        const message = [
          'Bundle built',
          Object.fromEntries(children.map(({ name, time }) => [name, time])),
        ];
        this.reporter.process({ type: 'info', issuer, timestamp, message });
      }

      this.reporter.flush();
      this.reporter.stop();
    });
  }

  start() {
    this.reporter.process({
      type: 'info',
      issuer: 'DevServer',
      timestamp: Date.now(),
      message: ['Starting build for platforms:', this.platforms.join(', ')],
    });

    this.watching = this.instance.watch(this.watchOptions, (error) => {
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

    if (!this.isCompilationInProgress[platform]) {
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
