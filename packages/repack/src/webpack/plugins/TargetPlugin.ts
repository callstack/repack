import path from 'path';
import webpack from 'webpack';
import { getRepackBootstrap } from '../../client/setup/inline/getRepackBootstrap';
import { WebpackPlugin } from '../../types';

/**
 * Plugin for tweaking the JavaScript runtime code to account for React Native environment.
 *
 * Globally available APIs differ with React Native and other target's like Web, so there are some
 * tweaks necessary to make the final bundle runnable inside React Native's JavaScript VM.
 *
 * @category Webpack Plugin
 */
export class TargetPlugin implements WebpackPlugin {
  /**
   * Apply the plugin.
   *
   * @param compiler Webpack compiler instance.
   */
  apply(compiler: webpack.Compiler) {
    compiler.options.target = false;
    compiler.options.output.chunkLoading = 'jsonp';
    compiler.options.output.chunkFormat = 'array-push';
    compiler.options.output.globalObject = 'self';

    new webpack.NormalModuleReplacementPlugin(
      /react-native([/\\]+)Libraries([/\\]+)Utilities([/\\]+)HMRClient\.js$/,
      function (resource) {
        const request = require.resolve(
          '../../client/setup/modules/DevServerClient'
        );
        const context = path.dirname(request);
        resource.request = request;
        resource.context = context;
        resource.createData.resource = request;
        resource.createData.context = context;
      }
    ).apply(compiler);

    // Overwrite `LoadScriptRuntimeModule.generate` to avoid shipping DOM specific
    // code in the bundle. `__webpack_require__.l` implementation is provided
    // in `../../../runtime/setupChunkLoader.ts`.
    webpack.runtime.LoadScriptRuntimeModule.prototype.generate = function () {
      return webpack.Template.asString([
        `${webpack.RuntimeGlobals.loadScript} = function(u, c, n, i) {`,
        webpack.Template.indent(
          `return __repack__.loadChunk.apply(this, u, c, n, i, "${this.chunk.id}");`
        ),
        '};',
      ]);
    };

    const renderBootstrap =
      webpack.javascript.JavascriptModulesPlugin.prototype.renderBootstrap;
    webpack.javascript.JavascriptModulesPlugin.prototype.renderBootstrap =
      function (...args) {
        const result = renderBootstrap.call(this, ...args);
        result.afterStartup.push('');
        result.afterStartup.push('// Re.Pack after startup');
        result.afterStartup.push(
          `__repack__.loadChunkCallback.push("${args[0].chunk.id}")`
        );
        return result;
      };

    compiler.hooks.environment.tap('TargetPlugin', () => {
      new webpack.BannerPlugin({
        raw: true,
        entryOnly: true,
        banner: getRepackBootstrap({
          chunkLoadingGlobal: compiler.options.output.chunkLoadingGlobal!,
        }),
      }).apply(compiler);
    });

    compiler.hooks.compilation.tap('TargetPlugin', (compilation) => {
      compilation.hooks.afterProcessAssets.tap('TargetPlugin', () => {
        for (const chunk of compilation.chunks) {
          const manifest = {
            id: chunk.id,
            name: chunk.name,
            files: [...chunk.files],
            auxiliaryFiles: [...chunk.auxiliaryFiles],
          };

          if (manifest.files.length) {
            const manifestFile = `${manifest.files[0]}.json`;
            chunk.auxiliaryFiles.add(manifestFile);
            compilation.emitAsset(
              manifestFile,
              new webpack.sources.RawSource(JSON.stringify(manifest))
            );
          }
        }
      });
    });
  }
}
