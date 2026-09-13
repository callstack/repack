import path from 'node:path';
import type { ResolveAlias, Compiler as RspackCompiler } from '@rspack/core';
import type { Compiler as WebpackCompiler } from 'webpack';
import { isRspackCompiler, moveElementBefore } from '../../helpers/index.js';
import { makePolyfillsRuntimeModule } from './PolyfillsRuntimeModule.js';
import {
  getReactNativeAssetRegistryAlias,
  getReactNativeDeepImportAliases,
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

    // Map `react-native/Libraries/Image/AssetRegistry` to the relocated
    // `src/asset-registry.js` on the React Native >= 0.87 layout (no-op on <= 0.86).
    // Done here because Repack's default resolver ignores `package.json` exports.
    // The exact-match alias must be prepended: enhanced-resolve and Rspack match
    // aliases in insertion order, so a user's generic `react-native` alias would
    // otherwise win and rewrite the request to a non-existent path before the
    // specific key is consulted.
    // `getReactNativeDeepImportAliases` likewise remaps `react-native/src/private`
    // to disk so first-party packages' deep imports keep resolving once package
    // exports are enabled (RN 0.87 dropped the `./src/*` export wildcard).
    const reactNativeAliases = {
      ...getReactNativeAssetRegistryAlias(reactNativePath),
      ...getReactNativeDeepImportAliases(reactNativePath),
    };
    if (Object.keys(reactNativeAliases).length > 0) {
      compiler.options.resolve.alias = {
        ...reactNativeAliases,
        ...compiler.options.resolve.alias,
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
