import type { moduleFederationPlugin as MF } from '@module-federation/sdk';
import type { Compiler as RspackCompiler } from '@rspack/core';
import { name as isIdentifier } from 'estree-util-is-identifier-name';
import type { Compiler as WebpackCompiler } from 'webpack';
import { isRspackCompiler } from '../utils/internal/index.js';

type JsModuleDescriptor = {
  identifier: string;
  name: string;
  id?: string;
};

/**
 * {@link ModuleFederationPlugin} configuration options.
 *
 * The fields and types are exactly the same as in the official `ModuleFederationPlugin`.
 *
 * You can check documentation for all supported options here: https://module-federation.io/configure/
 */
export interface ModuleFederationPluginV2Config
  extends MF.ModuleFederationPluginOptions {
  /**
   *  List of default runtime plugins for Federation Runtime.
   *  Useful if you want to modify or disable behaviour of runtime plugins.
   *
   *  Defaults to an array containing:
   *    - '@callstack/repack/mf/core-plugin
   *    - '@callstack/repack/mf/resolver-plugin
   */
  defaultRuntimePlugins?: string[];
  /** Enable or disable adding React Native deep imports to shared dependencies. Defaults to true */
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
 *   name: 'host',
 * });
 * ```
 *
 * @example Host example with additional `shared` dependencies.
 * ```js
 * import * as Repack from '@callstack/repack';
 *
 * new Repack.plugins.ModuleFederationPlugin({
 *   name: 'host',
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
export class ModuleFederationPluginV2 {
  public config: MF.ModuleFederationPluginOptions;
  private deepImports: boolean;
  private defaultRuntimePlugins: string[];

  constructor(pluginConfig: ModuleFederationPluginV2Config) {
    const { defaultRuntimePlugins, reactNativeDeepImports, ...config } =
      pluginConfig;
    this.config = config;
    this.deepImports = reactNativeDeepImports ?? true;
    this.defaultRuntimePlugins = defaultRuntimePlugins ?? [
      '@callstack/repack/mf/core-plugin',
      '@callstack/repack/mf/resolver-plugin',
      '@callstack/repack/mf/prefetch-plugin',
    ];
  }

  private validateModuleFederationContainerName(name: string | undefined) {
    if (!name) return;
    if (!isIdentifier(name)) {
      const error = new Error(
        `[RepackModuleFederationPlugin] The container's name: '${name}' must be a valid JavaScript identifier. ` +
          'Please correct it to proceed. For more information, see: https://developer.mozilla.org/en-US/docs/Glossary/Identifier'
      );
      // remove the stack trace to make the error more readable
      error.stack = undefined;
      throw error;
    }
  }

  private ensureModuleFederationPackageInstalled(context: string) {
    try {
      require.resolve('@module-federation/enhanced', { paths: [context] });
    } catch {
      throw new Error(
        "[RepackModuleFederationPlugin] Dependency '@module-federation/enhanced' is required, but not found in your project. " +
          'Did you forget to install it?'
      );
    }
  }

  private adaptRuntimePlugins(
    context: string,
    runtimePlugins: string[] | undefined = []
  ) {
    const plugins = runtimePlugins
      .map((pluginPath) => {
        try {
          // resolve the paths to compare against absolute paths
          return require.resolve(pluginPath, { paths: [context] });
        } catch {
          // ignore invalid paths
          return undefined;
        }
      })
      .filter((pluginPath) => !!pluginPath) as string[];

    for (const plugin of this.defaultRuntimePlugins) {
      const pluginPath = require.resolve(plugin);
      if (!plugins.includes(pluginPath)) {
        plugins.unshift(pluginPath);
      }
    }

    return plugins;
  }

  private getModuleFederationPlugin(compiler: RspackCompiler) {
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

    if (!this.deepImports || !sharedReactNative) {
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

  private setupIgnoredWarnings(compiler: RspackCompiler) {
    // MF2 produces warning about not supporting async await
    // we can silence this warning since it works just fine
    compiler.options.ignoreWarnings = compiler.options.ignoreWarnings ?? [];
    compiler.options.ignoreWarnings.push(
      (warning) => warning.name === 'EnvironmentNotSupportAsyncWarning'
    );
    // MF2 produces warning about dynamic import in loadEsmEntry but it's not relevant
    // in RN env since we override the loadEntry logic through a hook
    // https://github.com/module-federation/core/blob/fa7a0bd20eb64eccd6648fea340c6078a2268e39/packages/runtime/src/utils/load.ts#L28-L37
    compiler.options.ignoreWarnings.push((warning) => {
      if ('moduleDescriptor' in warning) {
        const moduleDescriptor = warning.moduleDescriptor as JsModuleDescriptor;

        // warning can come from either runtime or runtime-core (in newer versions of MF2)
        const isMF2Runtime = moduleDescriptor.name.endsWith(
          '@module-federation/runtime/dist/index.cjs.js'
        );
        const isMF2RuntimeCore = moduleDescriptor.name.endsWith(
          '@module-federation/runtime-core/dist/index.cjs.js'
        );

        if (isMF2Runtime || isMF2RuntimeCore) {
          const requestExpressionWarning =
            /Critical dependency: the request of a dependency is an expression/;
          return requestExpressionWarning.test(warning.message);
        }
      }

      return false;
    });
  }

  apply(compiler: RspackCompiler): void;
  apply(compiler: WebpackCompiler): void;

  apply(__compiler: unknown) {
    const compiler = __compiler as RspackCompiler;

    this.validateModuleFederationContainerName(this.config.name);
    this.ensureModuleFederationPackageInstalled(compiler.context);
    this.setupIgnoredWarnings(compiler);

    const ModuleFederationPlugin = this.getModuleFederationPlugin(compiler);

    const sharedConfig = this.adaptSharedDependencies(
      this.config.shared ?? this.getDefaultSharedDependencies()
    );

    const shareStrategyConfig = this.config.shareStrategy ?? 'loaded-first';

    const runtimePluginsConfig = this.adaptRuntimePlugins(
      compiler.context,
      this.config.runtimePlugins
    );

    // By setting FEDERATION_ALLOW_NEW_FUNCTION to true, we prevent injecting
    // dynamic import (marked with webpackIgnore magic comment) into the bundle.
    // This is problematic when we run the Hermes compiler inside of `HermesBytecodePlugin`
    // because Hermes doesn't understand dynamic import syntax and throws an error.
    // Note that `loadEsmEntry` which this workaround affects is not even used in RN
    // since we provide our own `loadEntry` implementation through a CorePlugin.
    // https://github.com/module-federation/core/blob/cbd5b7eed1fd13d7256f19664bbe6394d6ad5233/packages/runtime-core/src/utils/load.ts#L29-L38
    new compiler.webpack.DefinePlugin({
      FEDERATION_ALLOW_NEW_FUNCTION: true,
    }).apply(compiler);

    // NOTE: we keep the default library config since it's the most compatible
    // Default library config uses 'externalType': 'script' and 'type': 'var'
    // var works identical to 'self' since declaring var in a global scope is
    // equal to assigning to the globalObject (normalized by Re.Pack to 'self')
    const config: MF.ModuleFederationPluginOptions = {
      ...this.config,
      shared: sharedConfig,
      shareStrategy: shareStrategyConfig,
      runtimePlugins: runtimePluginsConfig,
    };

    new ModuleFederationPlugin(config).apply(compiler);
  }
}
