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
    private filesystem: Pick<typeof fs, 'ensureDir' | 'copyFile'> = fs
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

    const [chunkFile] = [...chunk.files];
    const relatedSourceMap =
      compilation.assetsInfo.get(chunkFile)?.related?.sourceMap;
    const sourceMapFile = Array.isArray(relatedSourceMap)
      ? relatedSourceMap[0]
      : relatedSourceMap;

    this.queue.push(() =>
      this.copyAsset(
        path.join(outputPath, chunkFile),
        isEntry
          ? bundleOutput
          : path.join(
              platform === 'ios' ? assetsDest : bundleOutputDir,
              chunkFile
            )
      )
    );

    if (sourceMapFile) {
      this.queue.push(() =>
        this.copyAsset(
          path.join(outputPath, sourceMapFile),
          isEntry
            ? sourcemapOutput
            : path.join(
                platform === 'ios' ? assetsDest : sourcemapOutputDir,
                sourceMapFile
              )
        )
      );
    }

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

    const manifests = [...chunk.auxiliaryFiles].filter((file) =>
      /\.bundle\.json$/.test(file)
    );
    this.queue.push(
      ...manifests.map(
        (asset) => () =>
          this.copyAsset(
            path.join(outputPath, asset),
            path.join(platform === 'ios' ? assetsDest : bundleOutputDir, asset)
          )
      )
    );
  }

  execute() {
    const queue = this.queue;
    this.queue = [];
    return queue.map((work) => work());
  }
}
