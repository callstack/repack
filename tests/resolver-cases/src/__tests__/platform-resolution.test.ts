import { describe, expect, test } from 'vitest';
import { setupTestEnvironment } from '../test-helpers.js';

describe('Platform Resolution', () => {
  test('should resolve iOS platform files when platform is ios', async () => {
    const { resolve } = await setupTestEnvironment(['platforms'], {
      platform: 'ios',
    });

    const result = await resolve('platform-specific-lib');
    expect(result).toBe('/node_modules/platform-specific-lib/index.ios.js');
  });

  test('should resolve Android platform files when platform is android', async () => {
    const { resolve } = await setupTestEnvironment(['platforms'], {
      platform: 'android',
    });

    const result = await resolve('platform-specific-lib');
    expect(result).toBe('/node_modules/platform-specific-lib/index.android.js');
  });

  test('should fallback to native when platform file not found', async () => {
    const { resolve } = await setupTestEnvironment(['platforms'], {
      platform: 'web',
    });

    const result = await resolve('platform-specific-lib');
    expect(result).toBe('/node_modules/platform-specific-lib/index.native.js');
  });

  test('should fallback to default when preferNativePlatform is false', async () => {
    const { resolve } = await setupTestEnvironment(['platforms'], {
      platform: 'web',
      preferNativePlatform: false,
    });

    const result = await resolve('platform-specific-lib');
    expect(result).toBe('/node_modules/platform-specific-lib/index.js');
  });

  test('should resolve nested platform-specific files', async () => {
    const { resolve } = await setupTestEnvironment(['platforms'], {
      platform: 'android',
    });

    const result = await resolve('platform-specific-lib/lib/utils');
    expect(result).toBe(
      '/node_modules/platform-specific-lib/lib/utils.android.js'
    );
  });
});
