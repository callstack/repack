import type { Compiler, RspackPluginInstance, container } from '@rspack/core';
// biome-ignore lint/correctness/noUnusedImports: needed for jsdoc
import type { Federated } from '../utils/federated.js';
import {
  ModuleFederationPluginV1,
  type ModuleFederationPluginV1Config,
} from './ModuleFederationPluginV1.js';

type MFPluginV1 = typeof container.ModuleFederationPluginV1;
type MFPluginV1Options = ConstructorParameters<MFPluginV1>[0];

/**
 * {@link ModuleFederationPluginV1Config} configuration options.
 *
 * The fields and types are exactly the same as in `webpack.container.ModuleFederationPlugin`.
 *
 * You can check documentation for all supported options here: https://webpack.js.org/plugins/module-federation-plugin/
 */
export type ModuleFederationPluginConfig = ModuleFederationPluginV1Config;

/**
 * Webpack plugin to configure Module Federation with platform differences
 * handled under the hood.
 *
 * Usually, you should use `Repack.plugin.ModuleFederationPlugin`
 * instead of `webpack.container.ModuleFederationPlugin`.
 *
 * `Repack.plugin.ModuleFederationPlugin` creates:
 * - default for `filename` option when `exposes` is defined
 * - default for `library` option when `exposes` is defined
 * - default for `shared` option with `react` and `react-native` dependencies
 * - converts `remotes` into `ScriptManager`-powered `promise new Promise` loaders
 *
 * You can overwrite all defaults by passing respective options.
 *
 * `remotes` will always be converted to ScriptManager`-powered `promise new Promise` loaders
 * using {@link Federated.createRemote}.
 *
 * @example Host example.
 * ```js
 * import * as Repack from '@callstack/repack';
 *
 * new Repack.plugins.ModuleFederationPlugin({
 *   name: 'host,
 * });
 * ```
 *
 * @example Host example with additional `shared` dependencies.
 * ```js
 * import * as Repack from '@callstack/repack';
 *
 * new Repack.plugins.ModuleFederationPlugin({
 *   name: 'host,
 *   shared: {
 *     react: Repack.Federated.SHARED_REACT,
 *     'react-native': Repack.Federated.SHARED_REACT,
 *     'react-native-reanimated': {
 *       singleton: true,
 *     },
 *   },
 * });
 * ```
 *
 * @example Container examples.
 * ```js
 * import * as Repack from '@callstack/repack';
 *
 * new Repack.plugins.ModuleFederationPlugin({
 *   name: 'app1',
 *   remotes: {
 *     module1: 'module1@https://example.com/module1.container.bundle',
 *   },
 * });
 *
 * new Repack.plugins.ModuleFederationPlugin({
 *   name: 'app2',
 *   remotes: {
 *     module1: 'module1@https://example.com/module1.container.bundle',
 *     module2: 'module1@dynamic',
 *   },
 * });
 * ```
 *
 * @category Webpack Plugin
 */
export class ModuleFederationPlugin implements RspackPluginInstance {
  private config: MFPluginV1Options;
  private deepImports: boolean;
  private plugin: ModuleFederationPluginV1;

  constructor(pluginConfig: ModuleFederationPluginV1Config) {
    const { reactNativeDeepImports, ...config } = pluginConfig;
    // exposed for compat with V1 plugin
    this.config = config;
    // exposed for compat with V1 plugin
    this.deepImports = reactNativeDeepImports ?? true;
    this.plugin = new ModuleFederationPluginV1(pluginConfig);
  }

  apply(compiler: Compiler) {
    const logger = compiler.getInfrastructureLogger('ModuleFederationPlugin');

    compiler.hooks.beforeCompile.tap('ModuleFederationPlugin', () => {
      logger.warn(
        'Notice: ModuleFederationPlugin currently points to ModuleFederationPluginV1. ' +
          'Re.Pack 5 introduced ModuleFederationPluginV2, which addresses many previous limitations. ' +
          'In the next major version of Re.Pack, ModuleFederationPlugin will point to ModuleFederationPluginV2. ' +
          'We recommend switching to the new ModuleFederationPluginV2 by importing it directly. ' +
          'If you want to keep using ModuleFederationPluginV1, which is no longer being iterated on, ' +
          'you can import ModuleFederationPluginV1 directly to prevent this warning from being shown every time.'
      );
    });

    this.plugin.apply(compiler);
  }
}
