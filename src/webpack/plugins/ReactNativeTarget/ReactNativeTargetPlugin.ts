import webpack from 'webpack';
import { WebpackPlugin } from '../../../types';

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

    new webpack.NormalModuleReplacementPlugin(
      /react-native\/Libraries\/Utilities\/HMRClient\.js$/,
      require.resolve('../../../runtime/DevServerClient')
    ).apply(compiler);

    // Overwrite `LoadScriptRuntimeModule.generate` to avoid shipping DOM specific
    // code in the bundle. `__webpack_require__.l` implementation is provided
    // in `../../../runtime/setupChunkLoader.ts`.
    webpack.runtime.LoadScriptRuntimeModule.prototype.generate = function () {
      return webpack.Template.asString([
        `${webpack.RuntimeGlobals.loadScript} = function() {`,
        webpack.Template.indent(
          "throw new Error('Missing implementation for __webpack_require__.l');"
        ),
        '};',
      ]);
    };
  }
}
