// @ts-ignore
import { needEntryDeferringCode } from 'webpack/lib/web/JsonpHelpers';
import webpack from 'webpack';
import { WebpackPlugin } from '../../../types';
import { ReactNativeChunkLoadingRuntimeModule } from './ReactNativeChunkLoadingRuntimeModule';

export class ReactNativeChunkLoadingPlugin implements WebpackPlugin {
  apply(compiler: webpack.Compiler) {
    compiler.hooks.thisCompilation.tap(
      'ReactNativeChunkLoadingPlugin',
      (compilation) => {
        const globalChunkLoading = compilation.outputOptions.chunkLoading;
        const isEnabledForChunk = (chunk: webpack.Chunk) => {
          const options = chunk.getEntryOptions();
          const chunkLoading = options?.chunkLoading || globalChunkLoading;
          return chunkLoading === 'react-native';
        };
        const onceForChunkSet = new WeakSet();
        const handler = (chunk: webpack.Chunk, set: Set<string>) => {
          if (onceForChunkSet.has(chunk)) return;
          onceForChunkSet.add(chunk);
          if (!isEnabledForChunk(chunk)) return;
          set.add(webpack.RuntimeGlobals.moduleFactoriesAddOnly);
          set.add(webpack.RuntimeGlobals.hasOwnProperty);
          compilation.addRuntimeModule(
            chunk,
            new ReactNativeChunkLoadingRuntimeModule(set)
          );
        };

        compilation.hooks.runtimeRequirementInTree
          .for(webpack.RuntimeGlobals.ensureChunkHandlers)
          .tap('ReactNativeChunkLoadingPlugin', handler);
        compilation.hooks.runtimeRequirementInTree
          .for(webpack.RuntimeGlobals.hmrDownloadUpdateHandlers)
          .tap('ReactNativeChunkLoadingPlugin', handler);
        compilation.hooks.runtimeRequirementInTree
          .for(webpack.RuntimeGlobals.hmrDownloadManifest)
          .tap('ReactNativeChunkLoadingPlugin', handler);
        compilation.hooks.runtimeRequirementInTree
          .for(webpack.RuntimeGlobals.baseURI)
          .tap('ReactNativeChunkLoadingPlugin', handler);

        compilation.hooks.runtimeRequirementInTree
          .for(webpack.RuntimeGlobals.ensureChunkHandlers)
          .tap('ReactNativeChunkLoadingPlugin', (chunk, set) => {
            if (!isEnabledForChunk(chunk)) return;
            // set.add(webpack.RuntimeGlobals.loadScript);
            set.add(webpack.RuntimeGlobals.getChunkScriptFilename);
          });
        compilation.hooks.runtimeRequirementInTree
          .for(webpack.RuntimeGlobals.hmrDownloadUpdateHandlers)
          .tap('ReactNativeChunkLoadingPlugin', (chunk, set) => {
            if (!isEnabledForChunk(chunk)) return;
            // set.add(webpack.RuntimeGlobals.loadScript);
            set.add(webpack.RuntimeGlobals.getChunkUpdateScriptFilename);
            set.add(webpack.RuntimeGlobals.moduleCache);
            set.add(webpack.RuntimeGlobals.hmrModuleData);
            set.add(webpack.RuntimeGlobals.moduleFactoriesAddOnly);
          });
        compilation.hooks.runtimeRequirementInTree
          .for(webpack.RuntimeGlobals.hmrDownloadManifest)
          .tap('ReactNativeChunkLoadingPlugin', (chunk, set) => {
            if (!isEnabledForChunk(chunk)) return;
            set.add(webpack.RuntimeGlobals.getUpdateManifestFilename);
          });

        compilation.hooks.additionalTreeRuntimeRequirements.tap(
          'ReactNativeChunkLoadingPlugin',
          (chunk, set) => {
            if (!isEnabledForChunk(chunk)) return;
            const withDefer = needEntryDeferringCode(compilation, chunk);
            if (withDefer) {
              set.add(webpack.RuntimeGlobals.startup);
              set.add(webpack.RuntimeGlobals.startupNoDefault);
              set.add(webpack.RuntimeGlobals.require);
              handler(chunk, set);
            }
          }
        );
      }
    );
  }
}
