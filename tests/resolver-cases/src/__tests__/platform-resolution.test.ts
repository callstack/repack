import { describe, expect, test } from 'vitest';
import { resolveFromApp, setupTestEnvironment } from '../setup.js';
import type { VirtualPackage } from '../virtual-fs.js';

// Template for a package with platform-specific files
const platformSpecificTemplate: VirtualPackage = {
  name: 'platform-specific-lib',
  version: '1.0.0',
  packageJson: {
    name: 'platform-specific-lib',
    version: '1.0.0',
    main: './index.js',
    'react-native': './index.native.js',
  },
  files: {
    'index.js': 'export const platform = "web";',
    'index.native.js': 'export const platform = "native";',
    'index.ios.js': 'export const platform = "ios";',
    'index.android.js': 'export const platform = "android";',
    'lib/utils.js': 'export const utils = "web";',
    'lib/utils.native.js': 'export const utils = "native";',
    'lib/utils.ios.js': 'export const utils = "ios";',
    'lib/utils.android.js': 'export const utils = "android";',
  },
};

// Template for a package with TypeScript platform extensions
const typescriptPlatformTemplate: VirtualPackage = {
  name: 'typescript-platform-lib',
  version: '1.0.0',
  packageJson: {
    name: 'typescript-platform-lib',
    version: '1.0.0',
    main: './dist/index.js',
    types: './dist/index.d.ts',
  },
  files: {
    'dist/index.js': 'export const platform = "web";',
    'dist/index.d.ts': 'export declare const platform: "web";',
    'dist/index.native.js': 'export const platform = "native";',
    'dist/index.native.d.ts': 'export declare const platform: "native";',
    'dist/index.ios.js': 'export const platform = "ios";',
    'dist/index.ios.d.ts': 'export declare const platform: "ios";',
    'dist/index.android.js': 'export const platform = "android";',
    'dist/index.android.d.ts': 'export declare const platform: "android";',
    'src/utils.ts': 'export const utils = "web";',
    'src/utils.native.ts': 'export const utils = "native";',
    'src/utils.ios.ts': 'export const utils = "ios";',
    'src/utils.android.ts': 'export const utils = "android";',
  },
};

describe('Platform Resolution', () => {
  test('should resolve iOS platform files when platform is ios', async () => {
    const context = await setupTestEnvironment(
      [{ name: 'platform-lib', package: platformSpecificTemplate }],
      { platform: 'ios', preferNativePlatform: true }
    );

    const result = await resolveFromApp(context, 'platform-lib');
    expect(result).toBe('/node_modules/platform-lib/index.ios.js');
  });

  test('should resolve Android platform files when platform is android', async () => {
    const context = await setupTestEnvironment(
      [{ name: 'platform-lib', package: platformSpecificTemplate }],
      { platform: 'android', preferNativePlatform: true }
    );

    const result = await resolveFromApp(context, 'platform-lib');
    expect(result).toBe('/node_modules/platform-lib/index.android.js');
  });

  test('should fallback to native when platform file not found', async () => {
    const context = await setupTestEnvironment(
      [{ name: 'platform-lib', package: platformSpecificTemplate }],
      { platform: 'web', preferNativePlatform: true }
    );

    const result = await resolveFromApp(context, 'platform-lib');
    expect(result).toBe('/node_modules/platform-lib/index.native.js');
  });

  test('should resolve platform-specific TypeScript files', async () => {
    const context = await setupTestEnvironment(
      [{ name: 'ts-platform-lib', package: typescriptPlatformTemplate }],
      { platform: 'ios', preferNativePlatform: true }
    );

    const result = await resolveFromApp(context, 'ts-platform-lib/src/utils');
    expect(result).toBe('/node_modules/ts-platform-lib/src/utils.ios.ts');
  });

  test('should prefer platform over native when preferNativePlatform is false', async () => {
    const context = await setupTestEnvironment(
      [{ name: 'platform-lib', package: platformSpecificTemplate }],
      { platform: 'ios', preferNativePlatform: false }
    );

    const result = await resolveFromApp(context, 'platform-lib');
    expect(result).toBe('/node_modules/platform-lib/index.ios.js');
  });

  test('should resolve nested platform-specific files', async () => {
    const context = await setupTestEnvironment(
      [{ name: 'platform-lib', package: platformSpecificTemplate }],
      { platform: 'android', preferNativePlatform: true }
    );

    const result = await resolveFromApp(context, 'platform-lib/lib/utils');
    expect(result).toBe('/node_modules/platform-lib/lib/utils.android.js');
  });
});
