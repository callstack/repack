import type {
  Compiler as RspackCompiler,
  Configuration as RspackConfiguration,
  RuleSetRule,
  RuleSetUseItem,
} from '@rspack/core';
import { createFsFromVolume, Volume } from 'memfs';
import { inject } from 'vitest';
import type {
  Compiler as WebpackCompiler,
  Configuration as WebpackConfiguration,
} from 'webpack';

export type BundlerType = 'rspack' | 'webpack';

type Compiler = RspackCompiler | WebpackCompiler;
type Configuration = RspackConfiguration | WebpackConfiguration;

function getBundlerType(): BundlerType {
  return inject('bundlerType');
}

/**
 * Create a compiler instance for the current bundler
 */
export async function createCompiler(config: Configuration): Promise<Compiler> {
  const type = getBundlerType();
  if (type === 'rspack') {
    const { rspack } = await import('@rspack/core');
    return rspack(config as RspackConfiguration);
  }
  const { webpack } = await import('webpack');
  return webpack(config as WebpackConfiguration);
}

/**
 * Create a virtual module plugin for the current bundler
 */
export async function createVirtualModulePlugin(
  modules: Record<string, string>
): Promise<{ apply(compiler: Compiler): void }> {
  const type = getBundlerType();
  if (type === 'rspack') {
    const { rspack } = await import('@rspack/core');
    return new rspack.experiments.VirtualModulesPlugin(modules);
  }
  const VirtualModulesPlugin = (await import('webpack-virtual-modules'))
    .default;
  return new VirtualModulesPlugin(modules);
}

/**
 * Run compilation and return the result
 */
export function compile(compiler: Compiler) {
  const volume = new Volume();
  const fileSystem = createFsFromVolume(volume);

  // @ts-expect-error memfs is compatible enough with webpack's output filesystem
  compiler.outputFileSystem = fileSystem;

  return new Promise<{ code: string; volume: InstanceType<typeof Volume> }>(
    (resolve, reject) => {
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
    }
  );
}

/**
 * Virtual modules for mocking React Native in tests
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

export type SwcLoaderOptions = {
  jsc?: {
    transform?: {
      react?: { development?: boolean; importSource?: string };
    };
  };
};

/**
 * Collect options of every `builtin:swc-loader` in `module.rules`,
 * including nested `oneOf` and `rules`
 */
export function collectSwcLoaderOptions(rules: unknown[]): SwcLoaderOptions[] {
  return rules.flatMap((rule) => {
    if (!rule || typeof rule !== 'object') return [];
    const { use, loader, options, oneOf, rules: nested } = rule as RuleSetRule;
    const uses = [use].flat().filter(Boolean) as RuleSetUseItem[];
    return [
      ...(loader === 'builtin:swc-loader' ? [options as SwcLoaderOptions] : []),
      ...uses
        .filter((item) => typeof item === 'object')
        .filter((item) => item.loader === 'builtin:swc-loader')
        .map((item) => (item as { options: SwcLoaderOptions }).options),
      ...collectSwcLoaderOptions(oneOf ?? []),
      ...collectSwcLoaderOptions(nested ?? []),
    ];
  });
}
