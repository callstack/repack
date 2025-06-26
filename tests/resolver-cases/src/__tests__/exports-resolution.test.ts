import { describe, expect, test } from 'vitest';
import { loadFixture, setupTestEnvironment } from '../test-helpers.js';

describe('Package Exports Resolution', () => {
  describe('React Strict DOM pattern', () => {
    test('should resolve to native version for react-native condition', async () => {
      const { resolve } = await setupTestEnvironment(
        { 'react-strict-dom': loadFixture('react-strict-dom') },
        { platform: 'ios', enablePackageExports: true }
      );

      const result = await resolve('react-strict-dom');
      expect(result).toBe(
        '/node_modules/react-strict-dom/dist/native/index.js'
      );
    });

    test('should resolve to DOM version when package exports disabled', async () => {
      const { resolve } = await setupTestEnvironment(
        { 'react-strict-dom': loadFixture('react-strict-dom') },
        { platform: 'ios', enablePackageExports: false }
      );

      // When exports are disabled, it should fallback to main field (which doesn't exist)
      // and then resolve to index.js (which also doesn't exist in this case)
      const result = await resolve('react-strict-dom');
      expect(result).toBe(null);
    });

    test('should resolve subpath exports', async () => {
      const { resolve } = await setupTestEnvironment(
        { 'react-strict-dom': loadFixture('react-strict-dom') },
        { platform: 'ios', enablePackageExports: true }
      );

      const result = await resolve('react-strict-dom/html');
      expect(result).toBe('/node_modules/react-strict-dom/dist/native/html.js');
    });
  });

  describe('Complex exports patterns', () => {
    test('should resolve ESM imports with react-native condition', async () => {
      const { resolve } = await setupTestEnvironment(
        { 'complex-lib': loadFixture('complex-lib') },
        { platform: 'ios', enablePackageExports: true }
      );

      const result = await resolve('complex-lib', '/app', 'esm');
      expect(result).toBe('/node_modules/complex-lib/esm/index.native.js');
    });

    test('should resolve CommonJS requires with react-native condition', async () => {
      const { resolve } = await setupTestEnvironment(
        { 'complex-lib': loadFixture('complex-lib') },
        { platform: 'ios', enablePackageExports: true }
      );

      const result = await resolve('complex-lib', '/app', 'commonjs');
      expect(result).toBe('/node_modules/complex-lib/cjs/index.native.js');
    });

    test('should resolve utils subpath', async () => {
      const { resolve } = await setupTestEnvironment(
        { 'complex-lib': loadFixture('complex-lib') },
        { platform: 'ios', enablePackageExports: true }
      );

      const esmResult = await resolve('complex-lib/utils', '/app', 'esm');
      expect(esmResult).toBe('/node_modules/complex-lib/esm/utils.js');

      const cjsResult = await resolve('complex-lib/utils', '/app', 'commonjs');
      expect(cjsResult).toBe('/node_modules/complex-lib/cjs/utils.js');
    });

    test('should resolve react-native only exports', async () => {
      const { resolve } = await setupTestEnvironment(
        { 'complex-lib': loadFixture('complex-lib') },
        { platform: 'ios', enablePackageExports: true }
      );

      const result = await resolve('complex-lib/native-only');
      expect(result).toBe('/node_modules/complex-lib/native-specific.js');
    });
  });
});
