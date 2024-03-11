import path from 'path';
import fs from 'fs-extra';
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
