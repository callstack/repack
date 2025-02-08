import path from 'node:path';
import type {
  Compiler,
  ResolveAlias,
  RspackPluginInstance,
} from '@rspack/core';
import { isRspackCompiler } from './utils/isRspackCompiler.js';
import { reorderDependencies } from './utils/reorderEntries.js';

export interface NativeEntryPluginConfig {
  /**
   * Absolute location to JS file with initialization logic for React Native.
   * Useful if you want to built for out-of-tree platforms.
   */
  initializeCoreLocation?: string;
}

export class NativeEntryPlugin implements RspackPluginInstance {
  constructor(private config: NativeEntryPluginConfig) {}

  private getReactNativePath(candidate: ResolveAlias[string] | undefined) {
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

  apply(compiler: Compiler) {
    const reactNativePath = this.getReactNativePath(
      compiler.options.resolve.alias?.['react-native']
    );

    const getReactNativePolyfills: () => string[] = require(
      path.join(reactNativePath, 'rn-get-polyfills.js')
    );

    const initializeCorePath =
      this.config?.initializeCoreLocation ??
      path.join(reactNativePath, 'Libraries/Core/InitializeCore.js');

    const initializeScriptManagerPath = require.resolve(
      '../modules/InitializeScriptManager.js'
    );

    const nativeEntries = [
      ...getReactNativePolyfills(),
      initializeCorePath,
      initializeScriptManagerPath,
    ];

    compiler.hooks.entryOption.tap(
      { name: 'NativeEntryPlugin', before: 'DevelopmentPlugin' },
      (_, entry) => {
        if (typeof entry === 'function') {
          // skip support for dynamic entries for now
          return;
        }

        // add native entries to all declared entry points
        Object.keys(entry).forEach((entryName) => {
          // runtime property defines the chunk name, otherwise it defaults to the entry key
          const entryChunkName = entry[entryName].runtime || entryName;

          for (const nativeEntry of nativeEntries) {
            new compiler.webpack.EntryPlugin(compiler.context, nativeEntry, {
              name: entryChunkName, // prepends the entry to the chunk of specified name
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
        { name: 'NativeEntryPlugin', stage: 1000 },
        (compilation) => {
          for (const entry of compilation.entries.values()) {
            reorderDependencies(entry.dependencies, {
              targetEntryPattern: '.federation/entry',
              beforeEntryRequest: nativeEntries[0],
            });
          }
        }
      );
    }
  }
}
