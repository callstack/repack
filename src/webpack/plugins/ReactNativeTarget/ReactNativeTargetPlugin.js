const EnableChunkLoadingPlugin = require('webpack/lib/javascript/EnableChunkLoadingPlugin');
const ArrayPushCallbackChunkFormatPlugin = require('webpack/lib/javascript/ArrayPushCallbackChunkFormatPlugin');
const ReactNativeChunkLoadingPlugin = require('./ReactNativeChunkLoadingPlugin');

export class ReactNativeTargetPlugin {
  apply(compiler) {
    compiler.options.target = false;
    compiler.options.output.chunkLoading = 'react-native';
    compiler.options.output.globalObject = 'this';
    EnableChunkLoadingPlugin.setEnabled(compiler, 'react-native');
    new ArrayPushCallbackChunkFormatPlugin().apply(compiler);
    new ReactNativeChunkLoadingPlugin().apply(compiler);
  }
}
