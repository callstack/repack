import path from 'node:path';
import type { ResolveAlias, Compiler as RspackCompiler } from '@rspack/core';
import type { Compiler as WebpackCompiler } from 'webpack';
import { isRspackCompiler, moveElementBefore } from '../../helpers/index.js';
import { makePolyfillsRuntimeModule } from './PolyfillsRuntimeModule.js';
import {
  getReactNativeAssetRegistryAlias,
  resolveReactNativePolyfills,
} from './reactNativeRuntime.js';

export interface NativeEntryPluginConfig {
  /**
   * Absolute location to JS file with initialization logic for React Native.
   * Useful if you want to built for out-of-tree platforms.
   */
  initializeCoreLocation?: string;
}

export class NativeEntryPlugin {
  constructor(private config: NativeEntryPluginConfig) {}

  private getReactNativePath(
    candidate: Exclude<ResolveAlias, false>[string] | undefined
  ) {
    let reactNativePath: string | undefined;
    if (typeof candidate === 'string') {
      reactNativePath = candidate;
    }
    if (typeof candidate === 'object') {
      const candidates = candidate.filter(Boolean) as string[];
      reactNativePath = candidates[0];
    }
    if (!reactNativePath) {
      reactNativePath = require.resolve('react-native');
    }

    return path.extname(reactNativePath)
      ? path.dirname(reactNativePath)
      : reactNativePath;
  }

  apply(compiler: RspackCompiler): void;
  apply(compiler: WebpackCompiler): void;

  apply(__compiler: unknown) {
    const compiler = __compiler as RspackCompiler;

    const reactNativePath = this.getReactNativePath(
      compiler.options.resolve.alias
        ? compiler.options.resolve.alias?.['react-native']
        : undefined
    );

    const getReactNativePolyfills = resolveReactNativePolyfills(
      compiler.context,
      reactNativePath
    );

    // Map the canonical `react-native/asset-registry` request (emitted by the
    // assets loader and IncludeModules) to the registry file that exists for
    // the installed React Native layout. Done here because Repack's default
    // resolver ignores `package.json` exports and the two layouts are not
    // reachable by a single request across both resolver modes.
    const assetRegistryAlias =
      getReactNativeAssetRegistryAlias(reactNativePath);
    if (assetRegistryAlias) {
      compiler.options.resolve.alias = {
        ...compiler.options.resolve.alias,
        ...assetRegistryAlias,
      };
    }

    const initializeCorePath =
      this.config?.initializeCoreLocation ??
      path.join(reactNativePath, 'Libraries/Core/InitializeCore.js');

    const initializeScriptManagerPath = require.resolve(
      '../../modules/InitializeScriptManager.js'
    );

    const includeModulesPath = require.resolve(
      '../../modules/IncludeModules.js'
    );

    const polyfillPaths = getReactNativePolyfills();

    const nativeEntries = [
      ...polyfillPaths,
      initializeCorePath,
      initializeScriptManagerPath,
      includeModulesPath,
    ];

    // Polyfills are entry modules (processed by loaders), but we also require them
    // from a runtime module to guarantee they execute before Module Federation's
    // startup wrapper. The duplicate require during startup is a cache hit.
    compiler.hooks.compilation.tap('RepackNativeEntryPlugin', (compilation) => {
      compilation.hooks.additionalTreeRuntimeRequirements.tap(
        'RepackNativeEntryPlugin',
        (chunk, runtimeRequirements) => {
          runtimeRequirements.add(
            compiler.webpack.RuntimeGlobals.moduleFactories
          );
          runtimeRequirements.add(compiler.webpack.RuntimeGlobals.require);
          compilation.addRuntimeModule(
            chunk,
            makePolyfillsRuntimeModule(compiler, { polyfillPaths })
          );
        }
      );
    });

    compiler.hooks.entryOption.tap(
      { name: 'RepackNativeEntryPlugin', before: 'RepackDevelopmentPlugin' },
      (_, entry) => {
        if (typeof entry === 'function') {
          throw new Error(
            '[RepackNativeEntryPlugin] Dynamic entry (function) is not supported.'
          );
        }

        // add native entries (including polyfills) to each declared entry point
        Object.keys(entry).forEach((entryName) => {
          const entryChunkName = entry[entryName].runtime || entryName;
          for (const nativeEntry of nativeEntries) {
            new compiler.webpack.EntryPlugin(compiler.context, nativeEntry, {
              name: entryChunkName,
            }).apply(compiler);
          }
        });
      }
    );

    if (!isRspackCompiler(compiler)) {
      // In Webpack, Module Federation Container entry gets injected during the compilation's make phase,
      // similar to how dynamic entries work. This means the federation entry is added after our native entries.
      // We need to reorder dependencies to ensure federation entry is placed before native entries.
      compiler.hooks.make.tap(
        { name: 'RepackNativeEntryPlugin', stage: 1000 },
        (compilation) => {
          for (const entry of compilation.entries.values()) {
            moveElementBefore(entry.dependencies, {
              elementToMove: /\.federation\/entry/,
              beforeElement: nativeEntries[0],
              getElement: (dependency) => dependency.request ?? '',
            });
          }
        }
      );
    }
  }
}
