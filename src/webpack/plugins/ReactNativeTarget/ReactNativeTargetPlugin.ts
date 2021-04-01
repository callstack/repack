import webpack from 'webpack';
// @ts-ignore
// import ArrayPushCallbackChunkFormatPlugin from 'webpack/lib/javascript/ArrayPushCallbackChunkFormatPlugin';
import { WebpackPlugin } from '../../../types';
// import { ReactNativeChunkLoadingPlugin } from './ReactNativeChunkLoadingPlugin';

/**
 * Plugin for tweaking the JavaScript runtime code to account for React Native environment.
 *
 * Globally available APIs differ with React Native and other target's like Web, so there are some
 * tweaks necessary to make the final bundle runnable inside React Native's JavaScript VM.
 *
 * @category Webpack Plugin
 */
export class ReactNativeTargetPlugin implements WebpackPlugin {
  /**
   * Apply the plugin.
   *
   * @param compiler Webpack compiler instance.
   */
  apply(compiler: webpack.Compiler) {
    compiler.options.target = false;
    compiler.options.output.chunkLoading = 'jsonp';
    compiler.options.output.chunkFormat = 'array-push';
    compiler.options.output.globalObject = 'this';
    compiler.options.output.chunkLoadingGlobal = 'rnwtLoadChunk';

    // webapck.javascript.EnableChunkLoadingPlugin.setEnabled(
    //   compiler,
    //   'react-native'
    // );

    new webpack.NormalModuleReplacementPlugin(
      /react-native\/Libraries\/Utilities\/HMRClient\.js$/,
      require.resolve('../../../runtime/DevServerClient')
    ).apply(compiler);

    webpack.runtime.LoadScriptRuntimeModule.prototype.generate = function () {
      return webpack.Template.asString([
        `${webpack.RuntimeGlobals.loadScript} = function() {`,
        webpack.Template.indent(
          "throw new Error('Missing implementation for __webpack_require__.l');"
        ),
        '};',
      ]);
    };

    // compiler.hooks.compilation.tap('ReactNativeTargetPlugin', (compilation) => {
    //   compilation.hooks.runtimeRequirementInTree
    //     .for(webpack.RuntimeGlobals.loadScript)
    //     .intercept({
    //       tap: (tapInfo) => {
    //         // require('inspector').open(undefined, undefined, true);
    //         // debugger;
    //         console.log(tapInfo);
    //       },
    //     });
    // });

    // new ArrayPushCallbackChunkFormatPlugin().apply(compiler);
    // new ReactNativeChunkLoadingPlugin().apply(compiler);
  }
}
