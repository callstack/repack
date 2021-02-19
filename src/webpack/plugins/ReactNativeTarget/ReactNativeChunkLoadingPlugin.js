const RuntimeGlobals = require('webpack/lib/RuntimeGlobals');
const { needEntryDeferringCode } = require('webpack/lib/web/JsonpHelpers');
const ReactNativeChunkLoadingRuntimeModule = require('./ReactNativeChunkLoadingRuntime');

class ReactNativeChunkLoadingPlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap(
      'ReactNativeChunkLoadingPlugin',
      (compilation) => {
        const globalChunkLoading = compilation.outputOptions.chunkLoading;
        const isEnabledForChunk = (chunk) => {
          const options = chunk.getEntryOptions();
          const chunkLoading =
            (options && options.chunkLoading) || globalChunkLoading;
          return chunkLoading === 'react-native';
        };
        const onceForChunkSet = new WeakSet();
        const handler = (chunk, set) => {
          if (onceForChunkSet.has(chunk)) return;
          onceForChunkSet.add(chunk);
          if (!isEnabledForChunk(chunk)) return;
          set.add(RuntimeGlobals.moduleFactoriesAddOnly);
          set.add(RuntimeGlobals.hasOwnProperty);
          compilation.addRuntimeModule(
            chunk,
            new ReactNativeChunkLoadingRuntimeModule(set)
          );
        };

        compilation.hooks.runtimeRequirementInTree
          .for(RuntimeGlobals.ensureChunkHandlers)
          .tap('ReactNativeChunkLoadingPlugin', handler);
        compilation.hooks.runtimeRequirementInTree
          .for(RuntimeGlobals.hmrDownloadUpdateHandlers)
          .tap('ReactNativeChunkLoadingPlugin', handler);
        compilation.hooks.runtimeRequirementInTree
          .for(RuntimeGlobals.hmrDownloadManifest)
          .tap('ReactNativeChunkLoadingPlugin', handler);
        compilation.hooks.runtimeRequirementInTree
          .for(RuntimeGlobals.baseURI)
          .tap('ReactNativeChunkLoadingPlugin', handler);

        compilation.hooks.runtimeRequirementInTree
          .for(RuntimeGlobals.ensureChunkHandlers)
          .tap('ReactNativeChunkLoadingPlugin', (chunk, set) => {
            if (!isEnabledForChunk(chunk)) return;
            // set.add(RuntimeGlobals.loadScript);
            set.add(RuntimeGlobals.getChunkScriptFilename);
          });
        compilation.hooks.runtimeRequirementInTree
          .for(RuntimeGlobals.hmrDownloadUpdateHandlers)
          .tap('ReactNativeChunkLoadingPlugin', (chunk, set) => {
            if (!isEnabledForChunk(chunk)) return;
            // set.add(RuntimeGlobals.loadScript);
            set.add(RuntimeGlobals.getChunkUpdateScriptFilename);
            set.add(RuntimeGlobals.moduleCache);
            set.add(RuntimeGlobals.hmrModuleData);
            set.add(RuntimeGlobals.moduleFactoriesAddOnly);
          });
        compilation.hooks.runtimeRequirementInTree
          .for(RuntimeGlobals.hmrDownloadManifest)
          .tap('ReactNativeChunkLoadingPlugin', (chunk, set) => {
            if (!isEnabledForChunk(chunk)) return;
            set.add(RuntimeGlobals.getUpdateManifestFilename);
          });

        compilation.hooks.additionalTreeRuntimeRequirements.tap(
          'ReactNativeChunkLoadingPlugin',
          (chunk, set) => {
            if (!isEnabledForChunk(chunk)) return;
            const withDefer = needEntryDeferringCode(compilation, chunk);
            if (withDefer) {
              set.add(RuntimeGlobals.startup);
              set.add(RuntimeGlobals.startupNoDefault);
              set.add(RuntimeGlobals.require);
              handler(chunk, set);
            }
          }
        );
      }
    );
  }
}

module.exports = ReactNativeChunkLoadingPlugin;
