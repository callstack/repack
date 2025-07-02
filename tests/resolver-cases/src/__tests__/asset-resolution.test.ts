import { describe, expect, test } from 'vitest';
import { setupTestEnvironment } from '../test-helpers.js';

describe('Asset Resolution', () => {
  test('should resolve scaled assets', async () => {
    const { resolve } = await setupTestEnvironment(['assets'], {
      platform: 'ios',
    });

    const result = await resolve('asset-lib/assets/icon.png');
    // scales are preffered so @1x.png is prefered over .png
    expect(result).toBe('/node_modules/asset-lib/assets/icon@1x.png');
  });

  test('should resolve different asset formats', async () => {
    const { resolve } = await setupTestEnvironment(['assets'], {
      platform: 'ios',
    });

    const jpgResult = await resolve('asset-lib/assets/logo.jpg');
    expect(jpgResult).toBe('/node_modules/asset-lib/assets/logo.jpg');

    const mp4Result = await resolve('asset-lib/assets/video.mp4');
    expect(mp4Result).toBe('/node_modules/asset-lib/assets/video.mp4');
  });
});
