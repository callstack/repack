import { describe, expect, test } from 'vitest';
import { setupTestEnvironment } from '../test-helpers.js';

describe('Package Exports Resolution', () => {
  describe('React Strict DOM pattern', () => {
    test('should resolve to native version for react-native condition', async () => {
      const { resolve } = await setupTestEnvironment(
        {
          'react-strict-dom': {
            'package.json': JSON.stringify({
              name: 'react-strict-dom',
              version: '0.0.36',
              description: 'React Strict DOM',
              exports: {
                '.': {
                  'react-native': {
                    types: './dist/native/index.d.ts',
                    default: './dist/native/index.js',
                  },
                  default: {
                    types: './dist/dom/index.d.ts',
                    default: './dist/dom/index.js',
                  },
                },
                './babel-preset': './babel/preset.js',
                './runtime': './dist/dom/runtime.js',
                './package.json': './package.json',
              },
            }),
            'dist/native/index.js': 'export const platform = "native";',
            'dist/native/index.d.ts':
              'export declare const platform: "native";',
            'dist/dom/index.js': 'export const platform = "dom";',
            'dist/dom/index.d.ts': 'export declare const platform: "dom";',
            'dist/dom/runtime.js': 'export const runtime = "dom";',
            'babel/preset.js': 'module.exports = {};',
          },
        },
        { platform: 'ios', enablePackageExports: true }
      );

      const result = await resolve('react-strict-dom');
      expect(result).toBe(
        '/node_modules/react-strict-dom/dist/native/index.js'
      );
    });

    test('should resolve to DOM version when package exports disabled', async () => {
      const { resolve } = await setupTestEnvironment(
        {
          'react-strict-dom': {
            'package.json': JSON.stringify({
              name: 'react-strict-dom',
              version: '0.0.36',
              description: 'React Strict DOM',
              exports: {
                '.': {
                  'react-native': {
                    types: './dist/native/index.d.ts',
                    default: './dist/native/index.js',
                  },
                  default: {
                    types: './dist/dom/index.d.ts',
                    default: './dist/dom/index.js',
                  },
                },
              },
            }),
            'dist/native/index.js': 'export const platform = "native";',
            'dist/dom/index.js': 'export const platform = "dom";',
          },
        },
        { platform: 'ios', enablePackageExports: false }
      );

      // Without package exports, should fall back to main field resolution
      const result = await resolve('react-strict-dom');
      expect(result).toBe(null); // No main field in this package
    });

    test('should resolve subpath exports', async () => {
      const { resolve } = await setupTestEnvironment(
        {
          'react-strict-dom': {
            'package.json': JSON.stringify({
              name: 'react-strict-dom',
              version: '0.0.36',
              exports: {
                './babel-preset': './babel/preset.js',
                './runtime': './dist/dom/runtime.js',
              },
            }),
            'dist/dom/runtime.js': 'export const runtime = "dom";',
            'babel/preset.js': 'module.exports = {};',
          },
        },
        { platform: 'ios', enablePackageExports: true }
      );

      const runtimeResult = await resolve('react-strict-dom/runtime');
      expect(runtimeResult).toBe(
        '/node_modules/react-strict-dom/dist/dom/runtime.js'
      );

      const babelResult = await resolve('react-strict-dom/babel-preset');
      expect(babelResult).toBe(
        '/node_modules/react-strict-dom/babel/preset.js'
      );
    });
  });

  describe('Complex exports patterns', () => {
    test('should resolve ESM imports with react-native condition', async () => {
      const { resolve } = await setupTestEnvironment(
        {
          'complex-lib': {
            'package.json': JSON.stringify({
              name: 'complex-exports-lib',
              version: '1.0.0',
              exports: {
                '.': {
                  import: {
                    'react-native': './esm/index.native.js',
                    default: './esm/index.js',
                  },
                  require: {
                    'react-native': './cjs/index.native.js',
                    default: './cjs/index.js',
                  },
                },
              },
            }),
            'esm/index.js':
              'export const format = "esm"; export const platform = "web";',
            'esm/index.native.js':
              'export const format = "esm"; export const platform = "native";',
            'cjs/index.js': 'exports.format = "cjs"; exports.platform = "web";',
            'cjs/index.native.js':
              'exports.format = "cjs"; exports.platform = "native";',
          },
        },
        { platform: 'ios', enablePackageExports: true }
      );

      const result = await resolve('complex-lib', '/app', 'esm');
      expect(result).toBe('/node_modules/complex-lib/esm/index.native.js');
    });

    test('should resolve CommonJS requires with react-native condition', async () => {
      const { resolve } = await setupTestEnvironment(
        {
          'complex-lib': {
            'package.json': JSON.stringify({
              name: 'complex-exports-lib',
              version: '1.0.0',
              exports: {
                '.': {
                  import: {
                    'react-native': './esm/index.native.js',
                    default: './esm/index.js',
                  },
                  require: {
                    'react-native': './cjs/index.native.js',
                    default: './cjs/index.js',
                  },
                },
              },
            }),
            'esm/index.js':
              'export const format = "esm"; export const platform = "web";',
            'esm/index.native.js':
              'export const format = "esm"; export const platform = "native";',
            'cjs/index.js': 'exports.format = "cjs"; exports.platform = "web";',
            'cjs/index.native.js':
              'exports.format = "cjs"; exports.platform = "native";',
          },
        },
        { platform: 'ios', enablePackageExports: true }
      );

      const result = await resolve('complex-lib', '/app', 'commonjs');
      expect(result).toBe('/node_modules/complex-lib/cjs/index.native.js');
    });

    test('should resolve utils subpath', async () => {
      const { resolve } = await setupTestEnvironment(
        {
          'complex-lib': {
            'package.json': JSON.stringify({
              name: 'complex-exports-lib',
              version: '1.0.0',
              exports: {
                './utils': {
                  import: './esm/utils.js',
                  require: './cjs/utils.js',
                },
              },
            }),
            'esm/utils.js': 'export const utils = "esm";',
            'cjs/utils.js': 'exports.utils = "cjs";',
          },
        },
        { platform: 'ios', enablePackageExports: true }
      );

      const esmResult = await resolve('complex-lib/utils', '/app', 'esm');
      expect(esmResult).toBe('/node_modules/complex-lib/esm/utils.js');

      const cjsResult = await resolve('complex-lib/utils', '/app', 'commonjs');
      expect(cjsResult).toBe('/node_modules/complex-lib/cjs/utils.js');
    });

    test('should resolve react-native only exports', async () => {
      const { resolve } = await setupTestEnvironment(
        {
          'complex-lib': {
            'package.json': JSON.stringify({
              name: 'complex-exports-lib',
              version: '1.0.0',
              exports: {
                './native': {
                  'react-native': './native/index.js',
                },
              },
            }),
            'native/index.js': 'export const platform = "native-only";',
          },
        },
        { platform: 'ios', enablePackageExports: true }
      );

      const result = await resolve('complex-lib/native');
      expect(result).toBe('/node_modules/complex-lib/native/index.js');
    });
  });
});
