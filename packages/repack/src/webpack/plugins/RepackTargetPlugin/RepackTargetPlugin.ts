import path from 'path';
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
    if (typeof candidate === 'string') {
      return candidate;
    } else if (typeof candidate === 'object') {
      const candidates = candidate.filter(Boolean) as string[];
      if (candidates.length > 0) {
        return candidates[0];
      }
    }
    return require.resolve('react-native');
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
    const getPolyfills = require(
      path.join(reactNativePath, 'rn-get-polyfills.js')
    );
    const entries = [
      ...getPolyfills(),
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

    const hmrClientRegexp =
      /react-native.*?([/\\]+)Libraries([/\\]+)Utilities([/\\]+)HMRClient$/;

    // Replace React Native's HMRClient.js with custom Webpack-powered DevServerClient.
    compiler.hooks.normalModuleFactory.tap('RepackTargetPlugin', (nmf) => {
      nmf.hooks.beforeResolve.tap('RepackTargetPlugin', (result) => {
        const absolutePath = path.resolve(result.context ?? '', result.request);

        if (hmrClientRegexp.test(absolutePath)) {
          const request = require.resolve('../../../modules/DevServerClient');
          const context = path.dirname(request);
          result.request = request;
          result.context = context;
        }
      });
    });

    // TODO remove undeeded runtime modules that are injected automatically here
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
        }
      );
    });
  }
}
