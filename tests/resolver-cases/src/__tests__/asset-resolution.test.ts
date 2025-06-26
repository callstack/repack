import { describe, expect, test } from 'vitest';
import { loadFixture, setupTestEnvironment } from '../test-helpers.js';

describe('Asset Resolution', () => {
  test('should resolve base asset when no scale specified and no scaled versions exist', async () => {
    const { resolve } = await setupTestEnvironment(
      { 'asset-lib': loadFixture('asset-lib-simple') },
      { platform: 'ios' }
    );

    const result = await resolve('asset-lib/assets/icon.png');
    expect(result).toBe('/node_modules/asset-lib/assets/icon.png');
  });

  test('should resolve 2x scaled assets when available', async () => {
    const { resolve } = await setupTestEnvironment(
      { 'asset-lib': loadFixture('asset-lib') },
      { platform: 'ios' }
    );

    // React Native prefers scaled assets when available
    const result = await resolve('asset-lib/assets/icon.png');
    expect(result).toBe('/node_modules/asset-lib/assets/icon@2x.png');
  });

  test('should resolve different asset formats', async () => {
    const { resolve } = await setupTestEnvironment(
      { 'asset-lib': loadFixture('asset-lib-simple') },
      { platform: 'ios' }
    );

    const jpgResult = await resolve('asset-lib/assets/logo.jpg');
    expect(jpgResult).toBe('/node_modules/asset-lib/assets/logo.jpg');

    const mp4Result = await resolve('asset-lib/assets/video.mp4');
    expect(mp4Result).toBe('/node_modules/asset-lib/assets/video.mp4');
  });
});
