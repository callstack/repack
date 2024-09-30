import fs from 'node:fs';
import path from 'node:path';

export class AuxiliaryAssetsCopyProcessor {
  queue: Array<() => Promise<void>> = [];

  constructor(
    public readonly config: {
      platform: string;
      outputPath: string;
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

  enqueueAsset(asset: string) {
    const { outputPath, assetsDest } = this.config;

    this.queue.push(() =>
      this.copyAsset(path.join(outputPath, asset), path.join(assetsDest, asset))
    );
  }

  execute() {
    const queue = this.queue;
    this.queue = [];
    return queue.map((work) => work());
  }
}
