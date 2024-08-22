import path from 'node:path';
import assert from 'node:assert';
import webpack from 'webpack';
import { WebpackPlugin } from '../../../types';
import { AssetsCopyProcessor } from '../utils/AssetsCopyProcessor';
import { AuxiliaryAssetsCopyProcessor } from '../utils/AuxiliaryAssetsCopyProcessor';
import { validateConfig } from './config';
import type { DestinationSpec, OutputPluginConfig } from './types';

/**
 * Plugin for copying generated files (bundle, chunks, assets) from Webpack's built location to the
 * React Native application directory, so that the files can be packed together into the `ipa`/`apk`.
 *
 * @category Webpack Plugin
 */
export class OutputPlugin implements WebpackPlugin {
  localSpecs: DestinationSpec[] = [];
  remoteSpecs: DestinationSpec[] = [];

  constructor(private config: OutputPluginConfig) {
    validateConfig(config);

    this.config.enabled = this.config.enabled ?? true;
    this.config.entryName = this.config.entryName ?? 'main';
    this.config.extraChunks = this.config.extraChunks ?? [
      {
        include: /.*/,
        type: 'remote',
        outputPath: path.join(
          this.config.context,
          'build/outputs',
          this.config.platform,
          'remotes'
        ),
      },
    ];

    this.config.extraChunks?.forEach((spec) => {
      if (spec.type === 'local') this.localSpecs.push(spec);
      if (spec.type === 'remote') this.remoteSpecs.push(spec);
    });
  }

  matchChunkToSpecs(
    chunk: webpack.StatsChunk,
    specs: DestinationSpec[]
  ): DestinationSpec[] {
    const chunkIds = [chunk.names ?? [], chunk.id!].flat();
    return specs.filter((spec) => {
      const { test, include, exclude } = spec;
      const config = { test, include, exclude };
      return chunkIds.some((id) =>
        webpack.ModuleFilenameHelpers.matchObject(config, id.toString())
      );
    });
  }

  getRelatedSourceMap(chunk: webpack.StatsChunk): string | undefined {
    return chunk.auxiliaryFiles?.find((file) => /\.map$/.test(file));
  }

  ensureAbsolutePath(filePath: string): string {
    if (path.isAbsolute(filePath)) return filePath;
    return path.join(this.config.context, filePath);
  }

  classifyChunks({
    chunks,
    entryOptions,
  }: {
    chunks: webpack.StatsChunk[];
    entryOptions: webpack.EntryNormalized;
  }): {
    localChunks: Set<webpack.StatsChunk>;
    remoteChunks: Set<webpack.StatsChunk>;
  } {
    const localChunks = new Set<webpack.StatsChunk>();
    const remoteChunks = new Set<webpack.StatsChunk>();

    const chunksById = new Map(chunks.map((chunk) => [chunk.id!, chunk]));

    // Add explicitly known initial chunks as local chunks
    chunks
      .filter((chunk) => chunk.initial && chunk.entry)
      .filter((chunk) => chunk.id! in entryOptions)
      .forEach((chunk) => localChunks.add(chunk));

    // Add siblings of known initial chunks as local chunks
    chunks
      .filter((chunk) => localChunks.has(chunk))
      .flatMap((chunk) => chunk.siblings!)
      .map((chunkId) => chunksById.get(chunkId))
      .forEach((chunk) => localChunks.add(chunk!));

    // Add chunks matching local specs as local chunks
    chunks
      .filter((chunk) => this.matchChunkToSpecs(chunk, this.localSpecs).length)
      .forEach((chunk) => localChunks.add(chunk));

    // Add parents of local chunks as local chunks
    const addParentsOfLocalChunks = () => {
      chunks
        .filter((chunk) => localChunks.has(chunk))
        .flatMap((chunk) => chunk.parents!)
        .map((chunkId) => chunksById.get(chunkId))
        .forEach((chunk) => localChunks.add(chunk!));
      return localChunks.size;
    };

    // Iterate until no new chunks are added
    while (localChunks.size - addParentsOfLocalChunks());

    // Add all other chunks as remote chunks
    chunks
      .filter((chunk) => !localChunks.has(chunk))
      .forEach((chunk) => remoteChunks.add(chunk));

    return { localChunks, remoteChunks };
  }

  /**
   * Apply the plugin.
   *
   * @param compiler Webpack compiler instance.
   */
  apply(compiler: webpack.Compiler): void {
    if (!this.config.enabled) return;

    assert(compiler.options.output.path, "Can't infer output path from config");

    const logger = compiler.getInfrastructureLogger('RepackOutputPlugin');
    const outputPath = compiler.options.output.path as string;

    const auxiliaryAssets = new Set<string>();

    compiler.hooks.done.tapPromise('RepackOutputPlugin', async (stats) => {
      const compilationStats = stats.toJson({
        all: false,
        assets: true,
        chunks: true,
        chunkRelations: true,
        ids: true,
      });

      const assets = compilationStats.assets!;

      const { localChunks, remoteChunks } = this.classifyChunks({
        chunks: compilationStats.chunks!,
        entryOptions: compiler.options.entry,
      });

      // Collect auxiliary assets (only remote-assets for now)
      assets
        .filter((asset) => /^remote-assets/.test(asset.name))
        .forEach((asset) => auxiliaryAssets.add(asset.name));

      let localAssetsCopyProcessor;
      let { bundleFilename, sourceMapFilename, assetsPath } =
        this.config.output;

      if (bundleFilename) {
        bundleFilename = this.ensureAbsolutePath(bundleFilename);

        const bundlePath = path.dirname(bundleFilename);

        sourceMapFilename = this.ensureAbsolutePath(
          sourceMapFilename || `${bundleFilename}.map`
        );

        assetsPath = assetsPath || bundlePath;

        logger.debug('Detected output paths:', {
          bundleFilename,
          bundlePath,
          sourceMapFilename,
          assetsPath,
        });

        localAssetsCopyProcessor = new AssetsCopyProcessor({
          platform: this.config.platform,
          outputPath,
          bundleOutput: bundleFilename,
          bundleOutputDir: bundlePath,
          sourcemapOutput: sourceMapFilename,
          assetsDest: assetsPath,
          logger,
        });
      }

      const remoteAssetsCopyProcessors: Record<string, AssetsCopyProcessor> =
        {};

      for (const chunk of localChunks) {
        // Process entry chunk - only one entry chunk is allowed here
        localAssetsCopyProcessor?.enqueueChunk(chunk, {
          isEntry: chunk.id! === this.config.entryName,
          sourceMapFile: this.getRelatedSourceMap(chunk),
        });
      }

      for (const chunk of remoteChunks) {
        const specs = this.matchChunkToSpecs(chunk, this.remoteSpecs);

        if (specs.length === 0) {
          throw new Error(`No spec found for chunk ${chunk.id}`);
        }
        if (specs.length > 1) {
          logger.warn(`Multiple specs found for chunk ${chunk.id}`);
        }

        const spec = specs[0] as { outputPath: string };
        const specOutputPath = this.ensureAbsolutePath(spec.outputPath);

        if (!remoteAssetsCopyProcessors[specOutputPath]) {
          remoteAssetsCopyProcessors[specOutputPath] = new AssetsCopyProcessor({
            platform: this.config.platform,
            outputPath,
            bundleOutput: '',
            bundleOutputDir: specOutputPath,
            sourcemapOutput: '',
            assetsDest: specOutputPath,
            logger,
          });
        }

        remoteAssetsCopyProcessors[specOutputPath].enqueueChunk(chunk, {
          isEntry: false,
          sourceMapFile: this.getRelatedSourceMap(chunk),
        });
      }

      let auxiliaryAssetsCopyProcessor;
      const auxiliaryAssetsPath = this.config.output.auxiliaryAssetsPath;
      if (auxiliaryAssetsPath) {
        auxiliaryAssetsCopyProcessor = new AuxiliaryAssetsCopyProcessor({
          platform: this.config.platform,
          outputPath,
          assetsDest: this.ensureAbsolutePath(auxiliaryAssetsPath),
          logger,
        });

        for (const asset of auxiliaryAssets) {
          auxiliaryAssetsCopyProcessor.enqueueAsset(asset);
        }
      }

      await Promise.all([
        ...(localAssetsCopyProcessor?.execute() ?? []),
        ...Object.values(remoteAssetsCopyProcessors).reduce(
          (acc, processor) => acc.concat(...processor.execute()),
          [] as Promise<void>[]
        ),
        ...(auxiliaryAssetsCopyProcessor?.execute() ?? []),
      ]);
    });
  }
}
