import webapck from 'webpack';
// @ts-ignore
import ArrayPushCallbackChunkFormatPlugin from 'webpack/lib/javascript/ArrayPushCallbackChunkFormatPlugin';
import { WebpackPlugin } from '../../../types';
import { ReactNativeChunkLoadingPlugin } from './ReactNativeChunkLoadingPlugin';

export class ReactNativeTargetPlugin implements WebpackPlugin {
  apply(compiler: webapck.Compiler) {
    compiler.options.target = false;
    compiler.options.output.chunkLoading = 'react-native';
    compiler.options.output.globalObject = 'this';
    webapck.javascript.EnableChunkLoadingPlugin.setEnabled(
      compiler,
      'react-native'
    );
    new ArrayPushCallbackChunkFormatPlugin().apply(compiler);
    new ReactNativeChunkLoadingPlugin().apply(compiler);
  }
}
