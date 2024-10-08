import path from 'node:path';
import type {
  Compiler,
  ResolveAlias,
  RspackPluginInstance,
} from '@rspack/core';

export interface NativeEntryPluginConfig {
  /**
   * Name of the chunk that is the first to load on the device.
   */
  entryName: string;
  /**
   * Absolute location to JS file with initialization logic for React Native.
   * Useful if you want to built for out-of-tree platforms.
   */
  initializeCoreLocation?: string;
}

export class NativeEntryPlugin implements RspackPluginInstance {
  constructor(private config?: NativeEntryPluginConfig) {}
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
      '../modules/InitializeScriptManager'
    );

    const entries = [
      ...getReactNativePolyfills(),
      initializeCorePath,
      initializeScriptManagerPath,
    ];

    new compiler.webpack.EntryPlugin(
      compiler.context,
      'data:text/javascript,globalThis.setImmediate = globalThis.setImmediate || function(){}',
      { name: undefined }
    ).apply(compiler);

    // Add entries after the rspack MF entry is added during `hook.afterPlugins` stage
    compiler.hooks.initialize.tap('NativeEntryPlugin', () => {
      for (const entry of entries) {
        new compiler.webpack.EntryPlugin(compiler.context, entry, {
          name: undefined,
        }).apply(compiler);
      }
    });
  }
}
