import fs from 'node:fs';
import { AuxiliaryAssetsCopyProcessor } from '../AuxiliaryAssetsCopyProcessor';
import { InfrastructureLogger } from '../../../../types';

jest.mock('node:fs');

describe('AuxiliaryAssetsCopyProcessor', () => {
  it('should copy enqueued asset to the target directory', async () => {
    await fs.promises.mkdir('/dist/remote-assets/example', { recursive: true });
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
        logger: { debug: jest.fn() } as unknown as InfrastructureLogger,
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
        '/target/ios/remote/remote-assets/example/pic.png'
      )
    ).toEqual('pic content');
    expect(
      await fs.promises.readFile(
        '/target/ios/remote/remote-assets/example/pic2.png'
      )
    ).toEqual('different pic content');
  });
});
