import type { moduleFederationPlugin as MF } from '@module-federation/sdk';
import type { Compiler as RspackCompiler } from '@rspack/core';
import { name as isIdentifier } from 'estree-util-is-identifier-name';
import type { Compiler as WebpackCompiler } from 'webpack';
import { isRspackCompiler } from '../helpers/index.js';

type RuntimePlugin = NonNullable<
  MF.ModuleFederationPluginOptions['runtimePlugins']
>[number];

/**
 * {@link ModuleFederationPluginV2} configuration options.
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
 * Webpack plugin to configure Module Federation 2.0 with platform differences
 * handled under the hood. Wraps `ModuleFederationPlugin` from `@module-federation/enhanced`.
 *
 * Also available as `Repack.plugins.ModuleFederationPlugin`.
 *
 * On top of the official plugin, it:
 * - registers Re.Pack's default runtime plugins (see `defaultRuntimePlugins`)
 * - defaults `shared` to eager singletons of `react` and `react-native`
 * - shares `react-native/` and `@react-native/` deep imports when `react-native` is shared
 * - defaults `shareStrategy` to `'loaded-first'`
 *
 * You can overwrite all defaults by passing respective options.
 *
 * @example Host example.
 * ```js
 * import * as Repack from '@callstack/repack';
 *
 * new Repack.plugins.ModuleFederationPlugin({
 *   name: 'host',
 *   remotes: {
 *     module1: 'module1@https://example.com/ios/mf-manifest.json',
 *   },
 * });
 * ```
 *
 * @example Container example.
 * ```js
 * import * as Repack from '@callstack/repack';
 *
 * new Repack.plugins.ModuleFederationPlugin({
 *   name: 'module1',
 *   filename: 'module1.container.js.bundle',
 *   exposes: {
 *     './Button': './src/Button',
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
    runtimePlugins: RuntimePlugin[] = []
  ): RuntimePlugin[] {
    const getPluginPath = (plugin: RuntimePlugin) =>
      typeof plugin === 'string' ? plugin : plugin[0];

    const plugins = runtimePlugins.flatMap((plugin): RuntimePlugin[] => {
      try {
        // resolve the paths to compare against absolute paths
        const pluginPath = require.resolve(getPluginPath(plugin), {
          paths: [context],
        });
        return [
          typeof plugin === 'string' ? pluginPath : [pluginPath, plugin[1]],
        ];
      } catch {
        // ignore invalid paths
        return [];
      }
    });

    for (const plugin of this.defaultRuntimePlugins) {
      const pluginPath = require.resolve(plugin);
      if (!plugins.some((item) => getPluginPath(item) === pluginPath)) {
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
    const sharedDependencyConfig = (
      eager: boolean | undefined,
      importValue: string | false | undefined
    ): MF.SharedConfig => {
      const config: MF.SharedConfig = {
        singleton: true,
        eager: eager ?? true,
        requiredVersion: '*',
      };
      // set import to false if it's explicitly set to false
      if (importValue === false) {
        config.import = false;
      }
      return config;
    };

    const findSharedDependency = (
      name: string,
      dependencies: MF.Shared
    ): MF.SharedConfig | string | undefined => {
      if (Array.isArray(dependencies)) {
        // object entries wrap the config under the dependency name,
        // so unwrap it instead of returning the wrapper
        for (const item of dependencies) {
          if (typeof item === 'string') {
            if (item === name) return item;
          } else if (item[name]) {
            return item[name];
          }
        }
        return undefined;
      }
      return dependencies[name];
    };

    const sharedReactNative = findSharedDependency('react-native', shared);
    const reactNativeEager =
      typeof sharedReactNative === 'object'
        ? sharedReactNative.eager
        : undefined;
    const reactNativeImport =
      typeof sharedReactNative === 'object'
        ? sharedReactNative.import
        : undefined;

    if (!this.deepImports || !sharedReactNative) {
      return shared;
    }

    if (Array.isArray(shared)) {
      const adjustedSharedDependencies = [...shared];
      if (!findSharedDependency('react-native/', shared)) {
        adjustedSharedDependencies.push({
          'react-native/': sharedDependencyConfig(
            reactNativeEager,
            reactNativeImport
          ),
        });
      }
      if (!findSharedDependency('@react-native/', shared)) {
        adjustedSharedDependencies.push({
          '@react-native/': sharedDependencyConfig(
            reactNativeEager,
            reactNativeImport
          ),
        });
      }
      return adjustedSharedDependencies;
    }
    const adjustedSharedDependencies = { ...shared };
    if (!findSharedDependency('react-native/', shared)) {
      Object.assign(adjustedSharedDependencies, {
        'react-native/': sharedDependencyConfig(
          reactNativeEager,
          reactNativeImport
        ),
      });
    }
    if (!findSharedDependency('@react-native/', shared)) {
      Object.assign(adjustedSharedDependencies, {
        '@react-native/': sharedDependencyConfig(
          reactNativeEager,
          reactNativeImport
        ),
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
