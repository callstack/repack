import path from 'path';
import fs from 'fs-extra';
import webpack from 'webpack';
import { CLI_OPTIONS_ENV_KEY } from '../../env';
import { CliOptions, Rule, WebpackLogger, WebpackPlugin } from '../../types';

/**
 * {@link OutputPlugin} configuration options.
 */
export interface OutputPluginConfig {
  /** Whether the development server is enabled and running. */
  devServerEnabled?: boolean;
  /**
   * Mark all chunks as a local chunk, meaning they will be bundled into the `.ipa`/`.apk` file.
   * All chunks not matched by the rule(s) will become a remote one.
   */
  localChunks?: Rule | Rule[];
  /**
   * Output directory for all remote chunks and assets that are not bundled into
   * the `.ipa`/`.apk` file.
   * When left unspecified (`undefined`), the files will be available under `output.path`, next to
   * the main/index bundle and other local chunks.
   */
  remoteChunksOutput?: string;
}

/**
 * Plugin for copying generated files (bundle, chunks, assets) from Webpack's built location to the
 * React Native application directory, so that the files can be packed together into the `ipa`/`apk`.
 *
 * @category Webpack Plugin
 */
export class OutputPlugin implements WebpackPlugin {
  /**
   * Constructs new `OutputPlugin`.
   *
   * @param config Plugin configuration options.
   */
  constructor(private config: OutputPluginConfig) {}

  /**
   * Apply the plugin.
   *
   * @param compiler Webpack compiler instance.
   */
  apply(compiler: webpack.Compiler) {
    const cliOptions: CliOptions | null = JSON.parse(
      process.env[CLI_OPTIONS_ENV_KEY] ?? 'null'
    );

    // Noop when running from Webpack CLI or when running with dev server
    if (
      !cliOptions ||
      'start' in cliOptions.arguments ||
      this.config.devServerEnabled
    ) {
      return;
    }

    const logger = compiler.getInfrastructureLogger('ReactNativeOutputPlugin');

    const args = cliOptions.arguments.bundle;
    let { bundleOutput, assetsDest = '', sourcemapOutput = '' } = args;
    if (!path.isAbsolute(bundleOutput)) {
      bundleOutput = path.join(cliOptions.config.root, bundleOutput);
    }

    if (!sourcemapOutput) {
      sourcemapOutput = `${bundleOutput}.map`;
    }
    if (!path.isAbsolute(sourcemapOutput)) {
      sourcemapOutput = path.join(cliOptions.config.root, sourcemapOutput);
    }

    if (!assetsDest) {
      assetsDest = path.dirname(bundleOutput);
    }

    let remoteChunksOutput = this.config.remoteChunksOutput;
    if (remoteChunksOutput && !path.isAbsolute(remoteChunksOutput)) {
      remoteChunksOutput = path.join(
        cliOptions.config.root,
        remoteChunksOutput
      );
    }

    logger.debug('Detected output paths:', {
      bundleOutput,
      sourcemapOutput,
      assetsDest,
      remoteChunksOutput,
    });

    const isLocalChunk = (chunkId: string): boolean =>
      webpack.ModuleFilenameHelpers.matchObject(
        {
          include: this.config.localChunks,
        },
        chunkId
      );

    let entryGroup: webpack.Compilation['chunkGroups'][0] | undefined;
    const localChunks: webpack.Chunk[] = [];
    const remoteChunks: webpack.Chunk[] = [];

    compiler.hooks.compilation.tap('OutputPlugin', (compilation) => {
      compilation.hooks.afterProcessAssets.tap('OutputPlugin', (assets) => {
        // require('inspector').open(undefined, undefined, true);
        entryGroup = compilation.chunkGroups.find((group) => group.isInitial());
        const sharedChunks = new Set<webpack.Chunk>();
        let entryChunk: webpack.Chunk | undefined;

        for (const chunk of compilation.chunks) {
          // Do not process shared chunks right now.
          if (sharedChunks.has(chunk)) {
            continue;
          }

          [...chunk.getAllInitialChunks()]
            .filter((sharedChunk) => sharedChunk !== chunk)
            .forEach((sharedChunk) => {
              sharedChunks.add(sharedChunk);
            });

          // Entry chunk
          if (entryGroup?.chunks[0] === chunk) {
            entryChunk = chunk;
            localChunks.push(chunk);
          } else if (isLocalChunk(chunk.name ?? chunk.id?.toString())) {
            localChunks.push(chunk);
          } else {
            remoteChunks.push(chunk);
          }
        }

        // Process shared chunks to add them either as local or remote chunk.
        for (const sharedChunk of sharedChunks) {
          const isUsedByLocalChunk = localChunks.some((localChunk) => {
            return [...localChunk.getAllInitialChunks()].includes(sharedChunk);
          });
          if (
            isUsedByLocalChunk ||
            isLocalChunk(sharedChunk.name ?? sharedChunk.id?.toString())
          ) {
            localChunks.push(sharedChunk);
          } else {
            remoteChunks.push(sharedChunk);
          }
        }

        if (!entryChunk) {
          throw new Error(
            'Cannot infer entry chunk - this should have not happened.'
          );
        }

        const mainBundleAssetName = [...entryChunk.files][0];
        const mainBundleSource = assets[mainBundleAssetName];
        assets[mainBundleAssetName] = new webpack.sources.ConcatSource(
          `var __CHUNKS__=${JSON.stringify({
            local: localChunks.map((localChunk) => localChunk.id),
          })};\n`,
          mainBundleSource
        );
      });
    });

    compiler.hooks.afterEmit.tapPromise('OutputPlugin', async (compilation) => {
      const outputPath = compilation.outputOptions.path;
      if (!outputPath) {
        throw new Error('Cannot infer output path from compilation');
      }

      const promises: Promise<void>[] = [];

      for (const chunk of localChunks) {
        // Process entry chunk
        if (entryGroup?.chunks[0] === chunk) {
          promises.push(
            ...this.processEntryChunkFiles(
              compilation,
              chunk,
              outputPath,
              bundleOutput,
              sourcemapOutput,
              logger
            )
          );
        } else {
          promises.push(
            ...this.processChunkFiles(
              compilation,
              chunk,
              outputPath,
              assetsDest,
              logger
            )
          );
        }

        promises.push(
          ...this.processChunkAuxiliaryFiles(
            chunk,
            outputPath,
            assetsDest,
            logger
          )
        );
      }

      if (remoteChunksOutput) {
        for (const chunk of remoteChunks) {
          promises.push(
            ...this.processChunkFiles(
              compilation,
              chunk,
              outputPath,
              remoteChunksOutput,
              logger
            )
          );

          promises.push(
            ...this.processChunkAuxiliaryFiles(
              chunk,
              outputPath,
              remoteChunksOutput,
              logger
            )
          );
        }
      }

      await Promise.all(promises);
    });
  }

  private async copyAsset(from: string, to: string, logger: WebpackLogger) {
    logger.debug('Copying asset:', from, 'to:', to);
    await fs.ensureDir(path.dirname(to));
    await fs.copyFile(from, to);
  }

  private processEntryChunkFiles(
    compilation: webpack.Compilation,
    chunk: webpack.Chunk,
    outputPath: string,
    bundleOutput: string,
    sourcemapOutput: string,
    logger: WebpackLogger
  ) {
    const promises = [];
    const [bundleFile] = [...chunk.files];
    const relatedSourceMap = compilation.assetsInfo.get(bundleFile)?.related
      ?.sourceMap;
    const sourceMapFile = Array.isArray(relatedSourceMap)
      ? relatedSourceMap[0]
      : relatedSourceMap;
    promises.push(
      this.copyAsset(path.join(outputPath, bundleFile), bundleOutput, logger)
    );
    if (sourceMapFile) {
      promises.push(
        this.copyAsset(
          path.join(outputPath, sourceMapFile),
          sourcemapOutput,
          logger
        )
      );
    }

    return promises;
  }

  private processChunkFiles(
    compilation: webpack.Compilation,
    chunk: webpack.Chunk,
    outputPath: string,
    assetsDest: string,
    logger: WebpackLogger
  ) {
    const promises = [];
    const [chunkFile] = [...chunk.files];
    const relatedSourceMap = compilation.assetsInfo.get(chunkFile)?.related
      ?.sourceMap;
    const sourceMapFile = Array.isArray(relatedSourceMap)
      ? relatedSourceMap[0]
      : relatedSourceMap;
    promises.push(
      this.copyAsset(
        path.join(outputPath, chunkFile),
        path.join(assetsDest, chunkFile),
        logger
      )
    );
    if (sourceMapFile) {
      promises.push(
        this.copyAsset(
          path.join(outputPath, sourceMapFile),
          path.join(assetsDest, sourceMapFile),
          logger
        )
      );
    }

    return promises;
  }

  private processChunkAuxiliaryFiles(
    chunk: webpack.Chunk,
    outputPath: string,
    assetsDest: string,
    logger: WebpackLogger
  ) {
    const assets = [...chunk.auxiliaryFiles].filter(
      (file) => !/\.map$/.test(file)
    );
    return assets.map((asset) =>
      this.copyAsset(
        path.join(outputPath, asset),
        path.join(assetsDest, asset),
        logger
      )
    );
  }
}
