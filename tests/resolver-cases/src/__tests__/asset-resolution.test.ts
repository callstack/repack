import { describe, expect, test } from 'vitest';
import { resolveFromApp, setupTestEnvironment } from '../setup.js';
import type { VirtualPackage } from '../virtual-fs.js';

// Template for asset resolution testing
const assetResolutionTemplate: VirtualPackage = {
  name: 'asset-lib',
  version: '1.0.0',
  packageJson: {
    name: 'asset-lib',
    version: '1.0.0',
    main: './index.js',
  },
  files: {
    'index.js': 'export const assets = require("./assets");',
    'assets/icon.png': 'fake-png-content',
    'assets/icon@2x.png': 'fake-png-content-2x',
    'assets/icon@3x.png': 'fake-png-content-3x',
    'assets/logo.jpg': 'fake-jpg-content',
    'assets/logo@2x.jpg': 'fake-jpg-content-2x',
    'assets/video.mp4': 'fake-mp4-content',
  },
};

describe('Asset Resolution', () => {
  test('should resolve base asset when no scale specified', async () => {
    const context = await setupTestEnvironment(
      [{ name: 'asset-lib', package: assetResolutionTemplate }],
      { platform: 'ios' }
    );

    const result = await resolveFromApp(context, 'asset-lib/assets/icon.png');
    expect(result).toBe('/node_modules/asset-lib/assets/icon.png');
  });

  test('should resolve 2x scaled assets', async () => {
    const context = await setupTestEnvironment(
      [{ name: 'asset-lib', package: assetResolutionTemplate }],
      { platform: 'ios' }
    );

    // This would typically be handled by extensionAlias in getResolveOptions
    const result = await resolveFromApp(
      context,
      'asset-lib/assets/icon@2x.png'
    );
    expect(result).toBe('/node_modules/asset-lib/assets/icon@2x.png');
  });

  test('should resolve different asset formats', async () => {
    const context = await setupTestEnvironment(
      [{ name: 'asset-lib', package: assetResolutionTemplate }],
      { platform: 'ios' }
    );

    const jpgResult = await resolveFromApp(
      context,
      'asset-lib/assets/logo.jpg'
    );
    expect(jpgResult).toBe('/node_modules/asset-lib/assets/logo.jpg');

    const mp4Result = await resolveFromApp(
      context,
      'asset-lib/assets/video.mp4'
    );
    expect(mp4Result).toBe('/node_modules/asset-lib/assets/video.mp4');
  });
});
