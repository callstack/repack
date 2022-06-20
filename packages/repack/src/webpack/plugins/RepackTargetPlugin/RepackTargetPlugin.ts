import path from 'path';
import webpack from 'webpack';
import type { WebpackPlugin } from '../../../types';
import { RepackInitRuntimeModule } from './runtime/RepackInitRuntimeModule';
import { RepackLoadScriptRuntimeModule } from './runtime/RepackLoadScriptRuntimeModule';

/**
 * Plugin for tweaking the JavaScript runtime code to account for React Native environment.
 *
 * Globally available APIs differ with React Native and other target's like Web, so there are some
 * tweaks necessary to make the final bundle runnable inside React Native's JavaScript VM.
 *
 * @category Webpack Plugin
 */
export class RepackTargetPlugin implements WebpackPlugin {
  /**
   * Apply the plugin.
   *
   * @param compiler Webpack compiler instance.
   */
  apply(compiler: webpack.Compiler) {
    const globalObject = 'self';
    compiler.options.target = false;
    compiler.options.output.chunkLoading = 'jsonp';
    compiler.options.output.chunkFormat = 'array-push';
    compiler.options.output.globalObject = globalObject;

    // Normalize global object.
    new webpack.BannerPlugin({
      raw: true,
      entryOnly: true,
      banner: webpack.Template.asString([
        `/******/ var ${globalObject} = ${globalObject} || this || new Function("return this")() || ({}); // repackGlobal'`,
        '/******/',
      ]),
    }).apply(compiler);

    // Replace React Native's HMRClient.js with custom Webpack-powered DevServerClient.
    new webpack.NormalModuleReplacementPlugin(
      /react-native([/\\]+)Libraries([/\\]+)Utilities([/\\]+)HMRClient\.js$/,
      function (resource) {
        const request = require.resolve('../../../modules/DevServerClient');
        const context = path.dirname(request);
        resource.request = request;
        resource.context = context;
        resource.createData.resource = request;
        resource.createData.context = context;
      }
    ).apply(compiler);

    compiler.hooks.compilation.tap('RepackTargetPlugin', (compilation) => {
      compilation.hooks.additionalTreeRuntimeRequirements.tap(
        'RepackTargetPlugin',
        (chunk, runtimeRequirements) => {
          runtimeRequirements.add(webpack.RuntimeGlobals.startupOnlyAfter);

          // Add code initialize Re.Pack's runtime logic.
          compilation.addRuntimeModule(
            chunk,
            new RepackInitRuntimeModule(
              chunk.id ?? undefined,
              globalObject,
              compiler.options.output.chunkLoadingGlobal!
            )
          );
        }
      );

      // Overwrite Webpack's default load script runtime code with Re.Pack's implementation
      // specific to React Native.
      compilation.hooks.runtimeRequirementInTree
        .for(webpack.RuntimeGlobals.loadScript)
        .tap('RepackTargetPlugin', (chunk) => {
          compilation.addRuntimeModule(
            chunk,
            new RepackLoadScriptRuntimeModule(chunk.id ?? undefined)
          );

          // Return `true` to make sure Webpack's default load script runtime is not added.
          return true;
        });
    });
  }
}
