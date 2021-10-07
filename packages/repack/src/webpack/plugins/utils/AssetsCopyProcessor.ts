import path from 'path';
import fs from 'fs-extra';
import webpack from 'webpack';
import { WebpackLogger } from '../../../types';

export class AssetsCopyProcessor {
  queue: Array<() => Promise<void>> = [];

  constructor(
    public readonly config: {
      platform: string;
      compilation: webpack.Compilation;
      outputPath: string;
      bundleOutput: string;
      bundleOutputDir: string;
      sourcemapOutput: string;
      assetsDest: string;
      logger: WebpackLogger;
    },
    private filesystem: Pick<
      typeof fs,
      'ensureDir' | 'copyFile' | 'readFile' | 'writeFile'
    > = fs
  ) {}

  private async copyAsset(from: string, to: string) {
    this.config.logger.debug('Copying asset:', from, 'to:', to);
    await this.filesystem.ensureDir(path.dirname(to));
    await this.filesystem.copyFile(from, to);
  }

  enqueueChunk(chunk: webpack.Chunk, { isEntry }: { isEntry: boolean }) {
    const {
      compilation,
      outputPath,
      bundleOutput,
      sourcemapOutput,
      bundleOutputDir,
      assetsDest,
      platform,
    } = this.config;
    const sourcemapOutputDir = path.dirname(sourcemapOutput);

    // Chunk bundle e.g: `index.bundle`, `src_App_js.chunk.bundle`
    const [chunkFile] = [...chunk.files];
    const relatedSourceMap =
      compilation.assetsInfo.get(chunkFile)?.related?.sourceMap;
    // Source map for the chunk e.g: `index.bundle.map`, `src_App_js.chunk.bundle.map`
    const sourceMapFile = Array.isArray(relatedSourceMap)
      ? relatedSourceMap[0]
      : relatedSourceMap;

    // Target file path where to save the bundle.
    const bundleDestination = isEntry
      ? bundleOutput
      : path.join(platform === 'ios' ? assetsDest : bundleOutputDir, chunkFile);

    // Target file path where to save the source map file.
    const sourceMapDestination = isEntry
      ? sourcemapOutput
      : path.join(
          platform === 'ios' ? assetsDest : sourcemapOutputDir,
          sourceMapFile ?? ''
        );

    // Entry chunks (main/index bundle) need to be processed differently to
    // adjust file name and the content of source mapping info to match values provided by:
    // - `--bundle-output` -> `bundleOutput`
    // - `--sourcemap-output` -> `sourcemapOutput`
    const shouldOverrideMappingInfo = isEntry && sourceMapFile;

    // Absolute path to chunk bundle file saved in `output.path`
    const chunkSource = path.join(outputPath, chunkFile);

    // If chunk is an entry chunk, meaning it's a main/index bundle,
    // save it based on `bundleDestination` and overwrite `sourceMappingURL`
    // to point to correct file name (e.g: `index.bundle.map` -> `main.jsbundle.map`).
    // Otherwise, simply copy the file to it's target `bundleDestination`.
    if (shouldOverrideMappingInfo) {
      this.queue.push(async () => {
        const bundleContent = await this.filesystem.readFile(
          chunkSource,
          'utf-8'
        );
        await this.filesystem.writeFile(
          bundleDestination,
          bundleContent.replace(
            /\/\/# sourceMappingURL=.*$/,
            `//# sourceMappingURL=${path.basename(sourceMapDestination)}`
          )
        );
      });
    } else {
      this.queue.push(() => this.copyAsset(chunkSource, bundleDestination));
    }

    if (sourceMapFile) {
      const sourceMapSource = path.join(outputPath, sourceMapFile);

      // If chunk is an entry chunk, meaning it's a main/index bundle,
      // save the source map file for it based on `sourceMapDestination` and values inside it,
      // to point to a correct bundle file name (e.g: `index.bundle` -> `main.jsbundle`).
      // Otherwise, simply copy the file to it's target `sourceMapDestination`.
      if (isEntry) {
        this.queue.push(async () => {
          const sourceMapContent = await this.filesystem.readFile(
            sourceMapSource,
            'utf-8'
          );
          await this.filesystem.writeFile(
            sourceMapDestination,
            sourceMapContent.replace(
              chunkFile,
              path.basename(bundleDestination)
            )
          );
        });
      } else {
        this.queue.push(() =>
          this.copyAsset(sourceMapSource, sourceMapDestination)
        );
      }
    }

    // Copy regular assets
    const mediaAssets = [...chunk.auxiliaryFiles].filter(
      (file) => !/\.(map|bundle\.json)$/.test(file)
    );
    this.queue.push(
      ...mediaAssets.map(
        (asset) => () =>
          this.copyAsset(
            path.join(outputPath, asset),
            path.join(assetsDest, asset)
          )
      )
    );

    // Manifest file name e.g: `index.bundle.json`, src_App_js.chunk.bundle.json`
    const [manifest] = [...chunk.auxiliaryFiles].filter((file) =>
      /\.bundle\.json$/.test(file)
    );
    const manifestSource = path.join(outputPath, manifest);
    const manifestDestination = path.join(
      platform === 'ios' ? assetsDest : bundleOutputDir,
      isEntry ? `${path.basename(bundleDestination)}.json` : manifest
    );

    // If chunk is an entry chunk, meaning it's a main bundle,
    // adjust chunk and source map names inside the manifest (e.g: `index.bundle` -> `main.jsbundle`,
    // `index.bundle.map` -> `main.jsbundle.map`).
    // Otherwise, simply copy the manifest.
    if (isEntry) {
      this.queue.push(async () => {
        const manifestContent = await this.filesystem.readFile(
          manifestSource,
          'utf-8'
        );
        await this.filesystem.writeFile(
          manifestDestination,
          manifestContent
            .replace(chunkFile, path.basename(bundleDestination))
            .replace(sourceMapFile ?? /.^/, path.basename(sourceMapDestination))
        );
      });
    } else {
      this.queue.push(() =>
        this.copyAsset(manifestSource, manifestDestination)
      );
    }
  }

  execute() {
    const queue = this.queue;
    this.queue = [];
    return queue.map((work) => work());
  }
}
