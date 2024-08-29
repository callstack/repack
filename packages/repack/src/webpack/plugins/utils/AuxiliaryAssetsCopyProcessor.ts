import fs from 'node:fs';
import path from 'node:path';
import { InfrastructureLogger } from '../../../types';

export class AuxiliaryAssetsCopyProcessor {
  queue: Array<() => Promise<void>> = [];

  constructor(
    public readonly config: {
      platform: string;
      outputPath: string;
      assetsDest: string;
      logger: InfrastructureLogger;
    },
    private filesystem = fs.promises
  ) {}

  private async copyAsset(from: string, to: string) {
    this.config.logger.debug('Copying asset:', from, 'to:', to);
    await this.filesystem.mkdir(path.dirname(to), { recursive: true });
    await this.filesystem.copyFile(from, to);
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
