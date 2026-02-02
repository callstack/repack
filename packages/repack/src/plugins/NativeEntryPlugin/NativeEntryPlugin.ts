import path from 'node:path';
import type { ResolveAlias, Compiler as RspackCompiler } from '@rspack/core';
import type { Compiler as WebpackCompiler } from 'webpack';
import { isRspackCompiler, moveElementBefore } from '../../helpers/index.js';
import { makePolyfillsRuntimeModule } from './PolyfillsRuntimeModule.js';

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

    const getReactNativePolyfills: () => string[] = require(
      path.join(reactNativePath, 'rn-get-polyfills.js')
    );

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
      initializeCorePath,
      initializeScriptManagerPath,
      includeModulesPath,
    ];

    // Add polyfills as runtime modules so they execute before the startup function.
    // This ensures polyfills run before Module Federation's embed_federation_runtime wrapper.
    compiler.hooks.compilation.tap('RepackNativeEntryPlugin', (compilation) => {
      compilation.hooks.additionalTreeRuntimeRequirements.tap(
        'RepackNativeEntryPlugin',
        (chunk) => {
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

        // add native entries to each declared entry point
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
