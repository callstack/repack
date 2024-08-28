import path from 'node:path';
import { EntryPlugin } from '@rspack/core';
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

    const entries = getReactNativePolyfills().concat(initializeCorePath);

    // Add React-Native entries
    for (const entry of entries) {
      new EntryPlugin(compiler.context, entry, {
        name: undefined,
      }).apply(compiler);
    }
  }
}
