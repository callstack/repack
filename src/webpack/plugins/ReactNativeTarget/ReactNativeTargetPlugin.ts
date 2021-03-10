import webapck from 'webpack';
// @ts-ignore
import ArrayPushCallbackChunkFormatPlugin from 'webpack/lib/javascript/ArrayPushCallbackChunkFormatPlugin';
import { WebpackPlugin } from '../../../types';
import { ReactNativeChunkLoadingPlugin } from './ReactNativeChunkLoadingPlugin';

/**
 * Plugin for tweaking the JavaScript runtime code to account for React Native environment.
 *
 * Globally available APIs differ with React Native and other target's like Web, so there are some
 * tweaks necessary to make the final bundle runnable inside React Native's JavaScript VM.
 */
export class ReactNativeTargetPlugin implements WebpackPlugin {
  /**
   * Apply the plugin.
   *
   * @param compiler Webpack compiler instance.
   */
  apply(compiler: webapck.Compiler) {
    compiler.options.target = false;
    compiler.options.output.chunkLoading = 'react-native';
    compiler.options.output.globalObject = 'this';

    new webapck.NormalModuleReplacementPlugin(
      /react-native\/Libraries\/Utilities\/HMRClient\.js$/,
      require.resolve('../../../runtime/DevServerClient')
    ).apply(compiler);

    webapck.javascript.EnableChunkLoadingPlugin.setEnabled(
      compiler,
      'react-native'
    );
    new ArrayPushCallbackChunkFormatPlugin().apply(compiler);
    new ReactNativeChunkLoadingPlugin().apply(compiler);
  }
}
