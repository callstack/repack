import path from 'node:path';
import rspack, { RspackPluginInstance, ResolveAlias } from '@rspack/core';
import type { DevServerOptions } from '../../../types';
import { generateLoadScriptRuntimeModule } from './runtime/RepackLoadScriptRuntimeModule';
import { generateRepackInitRuntimeModule } from './runtime/RepackInitRuntimeModule';

/**
 * {@link RepackTargetPlugin} configuration options.
 */
export interface RepackTargetPluginConfig
  extends Pick<DevServerOptions, 'hmr'> {
  /**
   * Absolute location to JS file with initialization logic for React Native.
   * Useful if you want to built for out-of-tree platforms.
   */
  initializeCoreLocation?: string;
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

  private getReactNativePath(candidate: ResolveAlias[string] | undefined) {
    let reactNativePath: string | undefined;
    if (typeof candidate === 'string') {
      reactNativePath = candidate;
    }
    if (typeof candidate === 'object') {
      const candidates = candidate.filter(Boolean) as string[];
      reactNativePath = candidates[0];
    }
    if (!reactNativePath) {
      reactNativePath = require.resolve('react-native');
    }
    return path.dirname(reactNativePath);
  }
  /**
   * Apply the plugin.
   *
   * @param compiler Webpack compiler instance.
   */
  apply(compiler: rspack.Compiler) {
    const globalObject = 'self';
    compiler.options.target = false;
    compiler.options.output.chunkLoading = 'jsonp';
    compiler.options.output.chunkFormat = 'array-push';
    compiler.options.output.globalObject = globalObject;

    const reactNativePath = this.getReactNativePath(
      compiler.options.resolve.alias?.['react-native']
    );

    const getReactNativePolyfills = require(
      path.join(reactNativePath, 'rn-get-polyfills.js')
    );

    const entries = [
      ...getReactNativePolyfills(),
      this.config?.initializeCoreLocation ||
        path.join(reactNativePath, 'Libraries/Core/InitializeCore.js'),
      require.resolve('../../../modules/configurePublicPath'),
    ];

    // Add React-Native entries
    for (const entry of entries) {
      new rspack.EntryPlugin(compiler.context, entry, {
        name: undefined,
      }).apply(compiler);
    }

    // Normalize global object.
    new rspack.BannerPlugin({
      raw: true,
      entryOnly: true,
      banner: rspack.Template.asString([
        `/******/ var ${globalObject} = ${globalObject} || this || new Function("return this")() || ({}); // repackGlobal'`,
        '/******/',
      ]),
    }).apply(compiler);

    // Replace React Native's HMRClient.js with custom Webpack-powered DevServerClient.
    new rspack.NormalModuleReplacementPlugin(
      /react-native.*?([/\\]+)Libraries[/\\]Utilities[/\\]HMRClient\.js$/,
      require.resolve('../../../modules/DevServerClient')
    ).apply(compiler);

    // ReactNativeTypes.js is flow type only module
    new rspack.NormalModuleReplacementPlugin(
      /react-native.*?([/\\]+)Libraries[/\\]Renderer[/\\]shims[/\\]ReactNativeTypes\.js$/,
      require.resolve('../../../modules/EmptyModule')
    ).apply(compiler);

    compiler.hooks.thisCompilation.tap('RepackTargetPlugin', (compilation) => {
      compilation.hooks.runtimeModule.tap(
        'RepackTargetPlugin',
        (module, chunk) => {
          // TODO determine if we need limit it to just the main chunk
          /**
           * We inject RePack's runtime modules only when load_script module is present.
           * This module is injected when:
           * 1. HMR is enabled
           * 2. Dynamic import is used anywhere in the project
           */
          if (module.name === 'load_script') {
            const loadScriptRuntimeModule = generateLoadScriptRuntimeModule(
              chunk.id
            );
            const initRuntimeModule = generateRepackInitRuntimeModule({
              chunkId: chunk.id,
              chunkLoadingGlobal: compiler.options.output.chunkLoadingGlobal!,
              globalObject: globalObject,
              hmrEnabled: this.config?.hmr,
            });

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
