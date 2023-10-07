import path from 'path';
import rspack, { RspackPluginInstance } from '@rspack/core';
import type { DevServerOptions } from '../../../types';

/**
 * {@link RepackTargetPlugin} configuration options.
 */
export interface RepackTargetPluginConfig
  extends Pick<DevServerOptions, 'hmr'> {}

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
  apply(compiler: rspack.Compiler) {
    const globalObject = 'self';
    compiler.options.target = false;
    compiler.options.output.chunkLoading = 'jsonp';
    compiler.options.output.chunkFormat = 'array-push';
    compiler.options.output.globalObject = globalObject;

    // RSPACK-TODO Verify this is still correct, or needs use of BannerPlugin
    compiler.options.builtins.banner = [
      {
        raw: true,
        entryOnly: true,
        banner: `var ${globalObject} = ${globalObject} || this || new Function("return this")() || ({}); // repackGlobal`,
      },
    ];

    const hmrClientRegexp =
      /react-native([/\\]+)Libraries([/\\]+)Utilities([/\\]+)HMRClient$/;

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

    // The rest of the functionality was moved directly into rspack for now
  }
}
