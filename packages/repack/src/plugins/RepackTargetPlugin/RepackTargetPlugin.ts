import type { Compiler, RspackPluginInstance } from '@rspack/core';

/**
 * {@link RepackTargetPlugin} configuration options.
 */
export interface RepackTargetPluginConfig {
  hmr?: boolean;
}

/**
 * Plugin for tweaking the JavaScript runtime code to account for React Native environment.
 *
 * Globally available APIs differ with React Native and other target's like Web, so there are some
 * tweaks necessary to make the final bundle runnable inside React Native's JavaScript VM.
 *
 * @category Webpack Plugin
 */
export class RepackTargetPlugin implements RspackPluginInstance {
  /**
   * Constructs new `RepackTargetPlugin`.
   *
   * @param config Plugin configuration options.
   */
  constructor(private config?: RepackTargetPluginConfig) {}

  /**
   * Apply the plugin.
   *
   * @param compiler Webpack compiler instance.
   */
  apply(compiler: Compiler) {
    const Template = compiler.webpack.Template;

    const globalObject = 'self';
    compiler.options.target = false;
    compiler.options.output.chunkLoading = 'jsonp';
    compiler.options.output.chunkFormat = 'array-push';
    compiler.options.output.globalObject = globalObject;

    // Normalize global object.
    new compiler.webpack.BannerPlugin({
      raw: true,
      entryOnly: true,
      banner: Template.asString([
        `/******/ var ${globalObject} = ${globalObject} || this || new Function("return this")() || ({}); // repackGlobal'`,
        '/******/',
      ]),
    }).apply(compiler);

    // Replace React Native's HMRClient.js with custom Webpack-powered DevServerClient.
    new compiler.webpack.NormalModuleReplacementPlugin(
      /react-native.*?([/\\]+)Libraries[/\\]Utilities[/\\]HMRClient\.js$/,
      require.resolve('../../modules/DevServerClient')
    ).apply(compiler);

    // ReactNativeTypes.js is flow type only module
    new compiler.webpack.NormalModuleReplacementPlugin(
      /react-native.*?([/\\]+)Libraries[/\\]Renderer[/\\]shims[/\\]ReactNativeTypes\.js$/,
      require.resolve('../../modules/EmptyModule')
    ).apply(compiler);

    compiler.hooks.thisCompilation.tap('RepackTargetPlugin', (compilation) => {
      compilation.hooks.runtimeModule.tap(
        'RepackTargetPlugin',
        (module, chunk) => {
          /**
           * We inject RePack's runtime modules only when load_script module is present.
           * This module is injected when:
           * 1. HMR is enabled
           * 2. Dynamic import is used anywhere in the project
           */
          if (module.name === 'load_script') {
            const loadScriptGlobal = compiler.webpack.RuntimeGlobals.loadScript;
            const loadScriptRuntimeModule = Template.asString([
              Template.getFunctionContent(
                require('./implementation/loadScript')
              )
                .replaceAll('$loadScript$', loadScriptGlobal)
                .replaceAll('$caller$', `'${chunk.id?.toString()}'`),
            ]);

            const initRuntimeModule = Template.asString([
              '// Repack runtime initialization logic',
              Template.getFunctionContent(require('./implementation/init'))
                .replaceAll('$globalObject$', globalObject)
                .replaceAll('$hmrEnabled$', `${this.config?.hmr ?? false}`),
            ]);

            // combine both runtime modules
            const repackRuntimeModule = Buffer.from(
              `${loadScriptRuntimeModule}\n${initRuntimeModule}`,
              'utf-8'
            );

            // inject runtime module
            module.source!.source = repackRuntimeModule;
          }

          // Remove CSS runtime modules
          if (
            module.name === 'css_loading' ||
            module.name === 'get css chunk filename'
          ) {
            module.source!.source = Buffer.from(`// noop`, 'utf-8');
          }
        }
      );
    });
  }
}
