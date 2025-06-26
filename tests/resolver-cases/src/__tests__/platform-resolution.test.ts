import { describe, expect, test } from 'vitest';
import { loadFixtures, setupTestEnvironment } from '../test-helpers.js';

describe('Platform Resolution', () => {
  test('should resolve iOS platform files when platform is ios', async () => {
    const { resolve } = await setupTestEnvironment(
      loadFixtures({ 'platform-lib': 'platform-lib' }),
      { platform: 'ios', preferNativePlatform: true }
    );

    const result = await resolve('platform-lib');
    expect(result).toBe('/node_modules/platform-lib/index.ios.js');
  });

  test('should resolve Android platform files when platform is android', async () => {
    const { resolve } = await setupTestEnvironment(
      loadFixtures({ 'platform-lib': 'platform-lib' }),
      { platform: 'android', preferNativePlatform: true }
    );

    const result = await resolve('platform-lib');
    expect(result).toBe('/node_modules/platform-lib/index.android.js');
  });

  test('should fallback to native when platform file not found', async () => {
    const { resolve } = await setupTestEnvironment(
      loadFixtures({ 'platform-lib': 'platform-lib' }),
      { platform: 'web', preferNativePlatform: true }
    );

    const result = await resolve('platform-lib');
    expect(result).toBe('/node_modules/platform-lib/index.native.js');
  });

  test('should resolve platform-specific TypeScript files', async () => {
    const { resolve } = await setupTestEnvironment(
      loadFixtures({ 'ts-platform-lib': 'ts-platform-lib' }),
      { platform: 'ios', preferNativePlatform: true }
    );

    const result = await resolve('ts-platform-lib/src/utils');
    expect(result).toBe('/node_modules/ts-platform-lib/src/utils.ios.ts');
  });

  test('should prefer platform over native when preferNativePlatform is false', async () => {
    const { resolve } = await setupTestEnvironment(
      loadFixtures({ 'platform-lib': 'platform-lib' }),
      { platform: 'ios', preferNativePlatform: false }
    );

    const result = await resolve('platform-lib');
    expect(result).toBe('/node_modules/platform-lib/index.ios.js');
  });

  test('should resolve nested platform-specific files', async () => {
    const { resolve } = await setupTestEnvironment(
      loadFixtures({ 'platform-lib': 'platform-lib' }),
      { platform: 'android', preferNativePlatform: true }
    );

    const result = await resolve('platform-lib/lib/utils');
    expect(result).toBe('/node_modules/platform-lib/lib/utils.android.js');
  });
});
