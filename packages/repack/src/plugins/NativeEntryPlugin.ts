import path from 'node:path';
import type {
  Compiler,
  EntryStaticNormalized,
  ResolveAlias,
  RspackPluginInstance,
} from '@rspack/core';
import { isRspackCompiler } from './utils/isRspackCompiler.js';

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

    const entries = [
      ...getReactNativePolyfills(),
      initializeCorePath,
      initializeScriptManagerPath,
    ];

    // Initialization of MF entry requires setImmediate to be defined
    // but in React Native it happens during InitializeCore so we need
    // to shim it here to prevent ReferenceError
    // TBD if this has any sort of impact
    new compiler.webpack.EntryPlugin(
      compiler.context,
      'data:text/javascript,globalThis.setImmediate = globalThis.setImmediate || function(){ /* noop */ };',
      { name: undefined }
    ).apply(compiler);

    // TODO (jbroma): refactor this to be more maintainable
    // This is a very hacky way to reorder entrypoints, and needs to be done differently
    // depending on the compiler type (rspack/webpack)
    if (isRspackCompiler(compiler)) {
      // Add entries after the rspack MF entry is added during `hook.afterPlugins` stage
      compiler.hooks.initialize.tap(
        { name: 'NativeEntryPlugin', stage: 100 },
        () => {
          for (const entry of entries) {
            new compiler.webpack.EntryPlugin(compiler.context, entry, {
              name: undefined,
            }).apply(compiler);
          }
        }
      );
    } else {
      const prependEntries = (entryConfig: EntryStaticNormalized) => {
        if (!(this.config.entryName in entryConfig)) {
          throw new Error(
            `Entry '${this.config.entryName}' does not exist in the entry configuration`
          );
        }
        entryConfig[this.config.entryName].import = [
          ...entries,
          ...(entryConfig[this.config.entryName].import ?? []),
        ];
        return entryConfig;
      };

      if (typeof compiler.options.entry === 'function') {
        const dynamicEntry = compiler.options.entry;
        compiler.options.entry = () => dynamicEntry().then(prependEntries);
      } else {
        compiler.options.entry = prependEntries(compiler.options.entry);
      }
    }
  }
}
