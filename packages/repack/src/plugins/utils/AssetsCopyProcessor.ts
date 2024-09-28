import fs from 'node:fs';
import path from 'node:path';
import type { StatsChunk } from '@rspack/core';

export class AssetsCopyProcessor {
  queue: Array<() => Promise<void>> = [];

  constructor(
    public readonly config: {
      platform: string;
      outputPath: string;
      bundleOutput: string;
      bundleOutputDir: string;
      sourcemapOutput: string;
      assetsDest: string;
      logger: {
        debug: (...args: string[]) => void;
      };
    },
    private filesystem = fs
  ) {}

  private async copyAsset(from: string, to: string) {
    this.config.logger.debug('Copying asset:', from, 'to:', to);
    await this.filesystem.promises.mkdir(path.dirname(to), { recursive: true });
    await this.filesystem.promises.copyFile(from, to);
  }

  enqueueChunk(
    chunk: StatsChunk,
    { isEntry, sourceMapFile }: { isEntry: boolean; sourceMapFile?: string }
  ) {
    const {
      outputPath,
      bundleOutput,
      sourcemapOutput,
      bundleOutputDir,
      assetsDest,
      platform,
    } = this.config;
    const sourcemapOutputDir = sourcemapOutput
      ? path.dirname(sourcemapOutput)
      : bundleOutputDir;

    // Chunk bundle e.g: `index.bundle`, `src_App_js.chunk.bundle`
    // There might be more than 1 file associated with the chunk -
    // this happens e.g. on web when importing CSS files into JS.
    // TBD whether this can ever occur in React Native.
    const chunkFile = chunk.files?.[0];

    // Sometimes there are no files associated with the chunk and the OutputPlugin fails
    // Skipping such chunks is a temporary workaround resulting in proper behaviour
    // This can happen when Module Federation is used and some chunks are not emitted
    // and are only used as temporary during compilation.
    if (!chunkFile) {
      return;
    }

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
        const bundleContent = await this.filesystem.promises.readFile(
          chunkSource,
          'utf-8'
        );
        await this.filesystem.promises.mkdir(path.dirname(bundleDestination), {
          recursive: true,
        });
        await this.filesystem.promises.writeFile(
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
          const sourceMapContent = await this.filesystem.promises.readFile(
            sourceMapSource,
            'utf-8'
          );
          await this.filesystem.promises.mkdir(
            path.dirname(sourceMapDestination),
            { recursive: true }
          );
          await this.filesystem.promises.writeFile(
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
    const mediaAssets = [...chunk.auxiliaryFiles!]
      .filter((file) => !/\.(map|bundle\.json)$/.test(file))
      .filter((file) => !/^remote-assets/.test(file));

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
    const [manifest] = [...chunk.auxiliaryFiles!].filter((file) =>
      /\.bundle\.json$/.test(file)
    );
    if (manifest) {
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
          const manifestContent = await this.filesystem.promises.readFile(
            manifestSource,
            'utf-8'
          );
          await this.filesystem.promises.mkdir(
            path.dirname(manifestDestination),
            { recursive: true }
          );
          await this.filesystem.promises.writeFile(
            manifestDestination,
            manifestContent
              .replace(chunkFile, path.basename(bundleDestination))
              .replace(
                sourceMapFile ?? /.^/,
                path.basename(sourceMapDestination)
              )
          );
        });
      } else {
        this.queue.push(() =>
          this.copyAsset(manifestSource, manifestDestination)
        );
      }
    }
  }

  execute() {
    const queue = this.queue;
    this.queue = [];
    return queue.map((work) => work());
  }
}
