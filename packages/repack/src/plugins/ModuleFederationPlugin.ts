import type { moduleFederationPlugin as MF } from '@module-federation/sdk';
import type { Compiler, RspackPluginInstance } from '@rspack/core';
import { isRspackCompiler } from './utils/isRspackCompiler';

/**
 * {@link ModuleFederationPlugin} configuration options.
 *
 * The fields and types are exactly the same as in the official `ModuleFederationPlugin`.
 *
 * You can check documentation for all supported options here: https://module-federation.io/configure/
 */
export interface ModuleFederationPluginConfig
  extends MF.ModuleFederationPluginOptions {
  /** Enable or disable adding React Native deep imports to shared dependencies */
  reactNativeDeepImports?: boolean;
}

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
  constructor(private config: ModuleFederationPluginConfig) {
    this.config.reactNativeDeepImports =
      this.config.reactNativeDeepImports ?? true;
  }

  private ensureModuleFederationModuleInstalled(context: string) {
    try {
      require.resolve('@module-federation/enhanced', { paths: [context] });
    } catch {
      throw new Error(
        "ModuleFederationPlugin requires '@module-federation/enhanced' to be present in your project. " +
          'Did you forget to install it?'
      );
    }
  }

  private getModuleFederationPlugin(compiler: Compiler) {
    if (isRspackCompiler(compiler)) {
      return require('@module-federation/enhanced/rspack')
        .ModuleFederationPlugin;
    }
    return require('@module-federation/enhanced/webpack')
      .ModuleFederationPlugin;
  }

  private getDefaultSharedDependencies() {
    return {
      react: { singleton: true, eager: true },
      'react-native': { singleton: true, eager: true },
    };
  }

  /**
   * As including 'react-native' as a shared dependency is not enough to support
   * deep imports from 'react-native' (e.g. 'react-native/Libraries/Utilities/PixelRatio'),
   * we need to add deep imports using an undocumented feature of ModuleFederationPlugin.
   *
   * When a dependency has a trailing slash, deep imports of that dependency will be correctly
   * resolved by reaching out to the shared scope. This also ensures single instances of things
   * like 'assetsRegistry'. Additionally, we mark every package from '@react-native' group as shared
   * as well, as these are used by React Native too.
   *
   * Reference: https://stackoverflow.com/questions/65636979/wp5-module-federation-sharing-deep-imports
   * Reference: https://github.com/webpack/webpack/blob/main/lib/sharing/resolveMatchedConfigs.js#L77-L79
   *
   * @param shared shared dependencies configuration from ModuleFederationPlugin
   * @returns adjusted shared dependencies configuration
   *
   * @internal
   */
  private adaptSharedDependencies(shared: MF.Shared): MF.Shared {
    const sharedDependencyConfig = (eager?: boolean) => ({
      singleton: true,
      eager: eager ?? true,
      requiredVersion: '*',
    });

    const findSharedDependency = (
      name: string,
      dependencies: MF.Shared
    ): MF.SharedConfig | string | undefined => {
      if (Array.isArray(dependencies)) {
        return dependencies.find((item) =>
          typeof item === 'string' ? item === name : Boolean(item[name])
        );
      }
      return dependencies[name];
    };

    const sharedReactNative = findSharedDependency('react-native', shared);
    const reactNativeEager =
      typeof sharedReactNative === 'object'
        ? sharedReactNative.eager
        : undefined;

    if (!this.config.reactNativeDeepImports || !sharedReactNative) {
      return shared;
    }

    if (Array.isArray(shared)) {
      const adjustedSharedDependencies = [...shared];
      if (!findSharedDependency('react-native/', shared)) {
        adjustedSharedDependencies.push({
          'react-native/': sharedDependencyConfig(reactNativeEager),
        });
      }
      if (!findSharedDependency('@react-native/', shared)) {
        adjustedSharedDependencies.push({
          '@react-native/': sharedDependencyConfig(reactNativeEager),
        });
      }
      return adjustedSharedDependencies;
    }
    const adjustedSharedDependencies = { ...shared };
    if (!findSharedDependency('react-native/', shared)) {
      Object.assign(adjustedSharedDependencies, {
        'react-native/': sharedDependencyConfig(reactNativeEager),
      });
    }
    if (!findSharedDependency('@react-native/', shared)) {
      Object.assign(adjustedSharedDependencies, {
        '@react-native/': sharedDependencyConfig(reactNativeEager),
      });
    }
    return adjustedSharedDependencies;
  }

  apply(compiler: Compiler) {
    this.ensureModuleFederationModuleInstalled(compiler.context);

    // MF2 produces warning about not supporting async await
    // we can silence this warning since it works just fine
    compiler.options.ignoreWarnings = compiler.options.ignoreWarnings ?? [];
    compiler.options.ignoreWarnings.push(
      (warning) => warning.name === 'EnvironmentNotSupportAsyncWarning'
    );

    const ModuleFederationPlugin = this.getModuleFederationPlugin(compiler);
    const sharedDependencies = this.adaptSharedDependencies(
      this.config.shared ?? this.getDefaultSharedDependencies()
    );

    const config: MF.ModuleFederationPluginOptions = {
      exposes: this.config.exposes,
      filename: this.config.filename,
      library: this.config.exposes
        ? {
            name: this.config.name,
            type: 'self',
            ...this.config.library,
          }
        : undefined,
      name: this.config.name,
      shared: sharedDependencies,
      shareScope: this.config.shareScope,
      remotes: this.config.remotes,
      remoteType: this.config.remoteType,
      runtime: this.config.runtime,
    };

    new ModuleFederationPlugin(config).apply(compiler);
  }
}
