import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  rspack as Rspack,
  Compiler as RspackCompiler,
} from '@rspack/core';
import { Volume, createFsFromVolume } from 'memfs';
import type { webpack as Webpack, Compiler as WebpackCompiler } from 'webpack';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type BundlerType = 'rspack' | 'webpack';
export type Bundler = typeof Rspack | typeof Webpack;
export type Compiler = RspackCompiler | WebpackCompiler;

/**
 * Dynamically import the bundler based on type
 */
export async function getBundler(type: BundlerType): Promise<Bundler> {
  if (type === 'rspack') {
    const { rspack } = await import('@rspack/core');
    return rspack;
  }
  const { webpack } = await import('webpack');
  return webpack;
}

/**
 * Create a virtual module plugin based on bundler type
 */
export async function createVirtualModulePlugin(
  type: BundlerType,
  modules: Record<string, string>
): Promise<unknown> {
  if (type === 'rspack') {
    const { RspackVirtualModulePlugin } = await import(
      'rspack-plugin-virtual-module'
    );
    return new RspackVirtualModulePlugin(modules);
  }
  const VirtualModulesPlugin = (await import('webpack-virtual-modules'))
    .default;
  return new VirtualModulesPlugin(modules);
}

/**
 * Create an output filesystem from a memfs volume
 */
export function createOutputFileSystem(volume: InstanceType<typeof Volume>) {
  return createFsFromVolume(volume);
}

/**
 * Create a memfs volume
 */
export function createVolume() {
  return new Volume();
}

export interface CompileResult {
  code: string;
  volume: InstanceType<typeof Volume>;
}

/**
 * Run compilation and return the result
 */
export function compile(compiler: Compiler): Promise<CompileResult> {
  const volume = new Volume();
  const fileSystem = createFsFromVolume(volume);

  // @ts-expect-error memfs is compatible enough with webpack's output filesystem
  compiler.outputFileSystem = fileSystem;

  return new Promise((resolve, reject) => {
    compiler.run((error, stats) => {
      if (error) {
        reject(error);
        return;
      }

      if (stats?.hasErrors()) {
        reject(new Error(stats.toString({ errors: true })));
        return;
      }

      const code = fileSystem.readFileSync('/out/main.js', 'utf-8') as string;
      resolve({ code, volume });
    });
  });
}

/**
 * Load fixture files from the __fixtures__ directory
 */
export function loadFixtures(...filenames: string[]): Record<string, Buffer> {
  return filenames.reduce(
    (acc, filename) => {
      const localPath = path.join(__dirname, '__fixtures__/assets', filename);
      const assetPath = `./__fixtures__/${filename}`;
      acc[assetPath] = fs.readFileSync(localPath);
      return acc;
    },
    {} as Record<string, Buffer>
  );
}

/**
 * Get the path to the assets loader from the built repack package
 */
export function getAssetsLoaderPath(): string {
  return require.resolve('@callstack/repack/assets-loader');
}

/**
 * Standard virtual modules for React Native mocking
 */
export function getReactNativeVirtualModules(
  pixelRatio = 1
): Record<string, string> {
  return {
    'package.json': '{ "type": "module" }',
    'node_modules/react-native/package.json':
      '{ "name": "react-native", "main": "./index.js" }',
    'node_modules/react-native/index.js': `module.exports = { PixelRatio: { get: () => ${pixelRatio} } };`,
    'node_modules/react-native/Libraries/Image/AssetRegistry.js':
      'module.exports = { registerAsset: (spec) => spec };',
    'node_modules/react-native/Libraries/Image/AssetSourceResolver.js': `
      module.exports = class AssetSourceResolver {
        constructor(a, b, c) {
          this.asset = c;
        }
        scaledAssetPath() {
          var scale = require('react-native').PixelRatio.get();
          var scaleSuffix = scale === 1 ? '' : '@x' + scale;
          return {
            __packager_asset: true,
            width: this.asset.width,
            height: this.asset.height,
            uri: this.asset.httpServerLocation + '/' + this.asset.name + scaleSuffix + '.' + this.asset.type,
            scale: scale,
          };
        }
        static pickScale(scales, pixelRatio) {
          return scales[pixelRatio - 1];
        }
      };`,
  };
}
