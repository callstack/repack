import path from 'node:path';
import type { Compilation, Compiler, RspackPluginInstance } from '@rspack/core';
import type { RuntimeModule as WebpackRuntimeModule } from 'webpack';

type RspackRuntimeModule = Parameters<
  Compilation['hooks']['runtimeModule']['call']
>[0];

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

  replaceRuntimeModule(
    module: RspackRuntimeModule | WebpackRuntimeModule,
    content: string
  ) {
    // webpack
    if ('getGeneratedCode' in module) {
      module.getGeneratedCode = () => content;
      return;
    }

    // rspack
    if (module.source !== undefined) {
      module.source.source = Buffer.from(content, 'utf-8');
    } else {
      // should never happen
      throw new Error('Module source is not available');
    }
  }
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

    // Disable built-in strict module error handling
    // this is handled through an interceptor in the
    // init module added to __webpack_require__.i array
    compiler.options.output.strictModuleErrorHandling = false;

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
      /react-native.*?([/\\]+)Libraries([/\\]+)Utilities([/\\]+)HMRClient\.js$/,
      (resource) => {
        const request = require.resolve('../../modules/DevServerClient');
        const context = path.dirname(request);
        resource.request = request;
        resource.context = context;
        // @ts-ignore
        resource.createData.resource = request;
        // @ts-ignore
        resource.createData.context = context;
      }
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
          if (module.name === 'load_script' || module.name === 'load script') {
            const loadScriptGlobal = compiler.webpack.RuntimeGlobals.loadScript;
            const loadScriptRuntimeModule = Template.asString([
              Template.getFunctionContent(
                require('./implementation/loadScript.ts')
              )
                .replaceAll('$loadScript$', loadScriptGlobal)
                .replaceAll('$caller$', `'${chunk.id?.toString()}'`),
            ]);

            const initRuntimeModule = Template.asString([
              '// Repack runtime initialization logic',
              Template.getFunctionContent(require('./implementation/init.ts'))
                .replaceAll('$globalObject$', globalObject)
                .replaceAll('$hmrEnabled$', `${this.config?.hmr ?? false}`),
            ]);

            // combine both runtime modules
            const repackRuntimeModule = `${loadScriptRuntimeModule}\n${initRuntimeModule}`;

            // inject runtime module
            this.replaceRuntimeModule(module, repackRuntimeModule.toString());
          }

          // Remove CSS runtime modules
          if (
            module.name === 'css_loading' ||
            module.name === 'get css chunk filename'
          ) {
            this.replaceRuntimeModule(module, '// noop');
          }
        }
      );
    });
  }
}
