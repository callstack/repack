import fs from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { AuxiliaryAssetsCopyProcessor } from '../AuxiliaryAssetsCopyProcessor.js';

vi.mock('node:fs', async () => ({
  default: (await vi.importActual('memfs')).fs,
}));

describe('AuxiliaryAssetsCopyProcessor', () => {
  it('should copy enqueued asset to the target directory', async () => {
    await fs.promises.mkdir('/dist/remote-assets/example/', {
      recursive: true,
    });
    await fs.promises.writeFile(
      '/dist/remote-assets/example/pic.png',
      'pic content'
    );
    await fs.promises.writeFile(
      '/dist/remote-assets/example/pic2.png',
      'different pic content'
    );

    const aacp = new AuxiliaryAssetsCopyProcessor(
      {
        platform: 'ios',
        logger: { debug: vi.fn() },
        outputPath: '/dist',
        assetsDest: '/target/ios/remote',
      },
      fs as any
    );
    aacp.enqueueAsset('remote-assets/example/pic.png');
    aacp.enqueueAsset('remote-assets/example/pic2.png');
    await Promise.all(aacp.execute());

    expect(
      await fs.promises.readFile(
        '/target/ios/remote/remote-assets/example/pic.png',
        'utf-8'
      )
    ).toEqual('pic content');
    expect(
      await fs.promises.readFile(
        '/target/ios/remote/remote-assets/example/pic2.png',
        'utf-8'
      )
    ).toEqual('different pic content');
  });
});
