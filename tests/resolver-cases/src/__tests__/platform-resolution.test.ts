import { describe, expect, test } from 'vitest';
import { setupTestEnvironment } from '../test-helpers.js';

describe('Platform Resolution', () => {
  test('should resolve iOS platform files when platform is ios', async () => {
    const { resolve } = await setupTestEnvironment(
      {
        'platform-lib': {
          'package.json': JSON.stringify({
            name: 'platform-specific-lib',
            version: '1.0.0',
            main: './index',
          }),
          'index.js': 'export const platform = "web";',
          'index.native.js': 'export const platform = "native";',
          'index.ios.js': 'export const platform = "ios";',
          'index.android.js': 'export const platform = "android";',
        },
      },
      { platform: 'ios', preferNativePlatform: true }
    );

    const result = await resolve('platform-lib');
    expect(result).toBe('/node_modules/platform-lib/index.ios.js');
  });

  test('should resolve Android platform files when platform is android', async () => {
    const { resolve } = await setupTestEnvironment(
      {
        'platform-lib': {
          'package.json': JSON.stringify({
            name: 'platform-specific-lib',
            version: '1.0.0',
            main: './index',
          }),
          'index.js': 'export const platform = "web";',
          'index.native.js': 'export const platform = "native";',
          'index.ios.js': 'export const platform = "ios";',
          'index.android.js': 'export const platform = "android";',
        },
      },
      { platform: 'android', preferNativePlatform: true }
    );

    const result = await resolve('platform-lib');
    expect(result).toBe('/node_modules/platform-lib/index.android.js');
  });

  test('should fallback to native when platform file not found', async () => {
    const { resolve } = await setupTestEnvironment(
      {
        'platform-lib': {
          'package.json': JSON.stringify({
            name: 'platform-specific-lib',
            version: '1.0.0',
            main: './index',
          }),
          'index.js': 'export const platform = "web";',
          'index.native.js': 'export const platform = "native";',
          'index.ios.js': 'export const platform = "ios";',
          'index.android.js': 'export const platform = "android";',
        },
      },
      { platform: 'web', preferNativePlatform: true }
    );

    const result = await resolve('platform-lib');
    expect(result).toBe('/node_modules/platform-lib/index.native.js');
  });

  test('should resolve platform-specific TypeScript files', async () => {
    const { resolve } = await setupTestEnvironment(
      {
        'ts-platform-lib': {
          'package.json': JSON.stringify({
            name: 'typescript-platform-lib',
            version: '1.0.0',
            main: './dist/index.js',
            types: './dist/index.d.ts',
          }),
          'dist/index.js': 'export const platform = "web";',
          'dist/index.d.ts': 'export declare const platform: "web";',
          'src/utils.ts': 'export const utils = "web";',
          'src/utils.native.ts': 'export const utils = "native";',
          'src/utils.ios.ts': 'export const utils = "ios";',
          'src/utils.android.ts': 'export const utils = "android";',
        },
      },
      { platform: 'ios', preferNativePlatform: true }
    );

    const result = await resolve('ts-platform-lib/src/utils');
    expect(result).toBe('/node_modules/ts-platform-lib/src/utils.ios.ts');
  });

  test('should prefer platform over native when preferNativePlatform is false', async () => {
    const { resolve } = await setupTestEnvironment(
      {
        'platform-lib': {
          'package.json': JSON.stringify({
            name: 'platform-specific-lib',
            version: '1.0.0',
            main: './index',
          }),
          'index.js': 'export const platform = "web";',
          'index.native.js': 'export const platform = "native";',
          'index.ios.js': 'export const platform = "ios";',
          'index.android.js': 'export const platform = "android";',
        },
      },
      { platform: 'ios', preferNativePlatform: false }
    );

    const result = await resolve('platform-lib');
    expect(result).toBe('/node_modules/platform-lib/index.ios.js');
  });

  test('should resolve nested platform-specific files', async () => {
    const { resolve } = await setupTestEnvironment(
      {
        'platform-lib': {
          'package.json': JSON.stringify({
            name: 'platform-specific-lib',
            version: '1.0.0',
            main: './index',
          }),
          'index.js': 'export const platform = "web";',
          'lib/utils.js': 'export const utils = "web";',
          'lib/utils.native.js': 'export const utils = "native";',
          'lib/utils.ios.js': 'export const utils = "ios";',
          'lib/utils.android.js': 'export const utils = "android";',
        },
      },
      { platform: 'android', preferNativePlatform: true }
    );

    const result = await resolve('platform-lib/lib/utils');
    expect(result).toBe('/node_modules/platform-lib/lib/utils.android.js');
  });
});
