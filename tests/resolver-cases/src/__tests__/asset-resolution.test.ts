import { describe, expect, test } from 'vitest';
import { setupTestEnvironment } from '../test-helpers.js';

describe('Asset Resolution', () => {
  test('should resolve base asset when no scale specified and no scaled versions exist', async () => {
    const { resolve } = await setupTestEnvironment(
      {
        'asset-lib': {
          'package.json': JSON.stringify({
            name: 'asset-lib',
            version: '1.0.0',
            main: './index.js',
          }),
          'index.js': 'export const assets = require("./assets");',
          'assets/icon.png': 'fake-png-content',
          'assets/logo.jpg': 'fake-jpg-content',
          'assets/video.mp4': 'fake-mp4-content',
        },
      },
      { platform: 'ios' }
    );

    const result = await resolve('asset-lib/assets/icon.png');
    expect(result).toBe('/node_modules/asset-lib/assets/icon.png');
  });

  test('should resolve 2x scaled assets when available', async () => {
    const { resolve } = await setupTestEnvironment(
      {
        'asset-lib': {
          'package.json': JSON.stringify({
            name: 'asset-lib',
            version: '1.0.0',
            main: './index.js',
          }),
          'index.js': 'export const assets = require("./assets");',
          'assets/icon.png': 'fake-png-content',
          'assets/icon@2x.png': 'fake-png-content-2x',
          'assets/icon@3x.png': 'fake-png-content-3x',
        },
      },
      { platform: 'ios' }
    );

    // React Native prefers scaled assets when available
    const result = await resolve('asset-lib/assets/icon.png');
    expect(result).toBe('/node_modules/asset-lib/assets/icon@2x.png');
  });

  test('should resolve different asset formats', async () => {
    const { resolve } = await setupTestEnvironment(
      {
        'asset-lib': {
          'package.json': JSON.stringify({
            name: 'asset-lib',
            version: '1.0.0',
            main: './index.js',
          }),
          'assets/logo.jpg': 'fake-jpg-content',
          'assets/video.mp4': 'fake-mp4-content',
        },
      },
      { platform: 'ios' }
    );

    const jpgResult = await resolve('asset-lib/assets/logo.jpg');
    expect(jpgResult).toBe('/node_modules/asset-lib/assets/logo.jpg');

    const mp4Result = await resolve('asset-lib/assets/video.mp4');
    expect(mp4Result).toBe('/node_modules/asset-lib/assets/video.mp4');
  });
});
