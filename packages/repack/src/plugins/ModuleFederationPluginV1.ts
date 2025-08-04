import type { Compiler as RspackCompiler, container } from '@rspack/core';
import type { Compiler as WebpackCompiler } from 'webpack';
import { Federated } from '../utils/federated.js';
import { isRspackCompiler } from '../utils/internal/index.js';

type MFPluginV1 = typeof container.ModuleFederationPluginV1;
type MFPluginV1Options = ConstructorParameters<MFPluginV1>[0];

type ExtractObject<T> = T extends {}
  ? T extends Array<any>
    ? never
    : T
  : never;

type RemotesObject = ExtractObject<MFPluginV1Options['remotes']>;

type SharedDependencies = Exclude<MFPluginV1Options['shared'], undefined>;

type SharedObject = ExtractObject<SharedDependencies>;

type SharedConfig = SharedObject extends { [key: string]: infer U }
  ? Exclude<U, string>
  : never;

/**
 * {@link ModuleFederationPlugin} configuration options.
 *
 * The fields and types are exactly the same as in `webpack.container.ModuleFederationPlugin`.
 *
 * You can check documentation for all supported options here: https://webpack.js.org/plugins/module-federation-plugin/
 */
export interface ModuleFederationPluginV1Config extends MFPluginV1Options {
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
export class ModuleFederationPluginV1 {
  private config: MFPluginV1Options;
  private deepImports: boolean;

  constructor(pluginConfig: ModuleFederationPluginV1Config) {
    const { reactNativeDeepImports, ...config } = pluginConfig;
    this.config = config;
    this.deepImports = reactNativeDeepImports ?? true;
  }

  /**
   * This method provides compatibility between webpack and Rspack for the ModuleFederation plugin.
   * In Rspack, Module Federation 1.5 is implemented under the name that's used in webpack for the original version.
   * This method adjusts for this naming difference to ensure we use the correct plugin version.
   *
   * @param compiler - The compiler instance (either webpack or Rspack)
   * @returns The appropriate ModuleFederationPlugin class
   */
  private getModuleFederationPlugin(compiler: RspackCompiler): MFPluginV1 {
    if (isRspackCompiler(compiler)) {
      return compiler.webpack.container.ModuleFederationPluginV1;
    }
    // @ts-expect-error webpack has MF1 under ModuleFederationPlugin
    return compiler.webpack.container.ModuleFederationPlugin;
  }

  private replaceRemotes<T extends string | string[] | RemotesObject>(
    remote: T
  ): T {
    if (typeof remote === 'string') {
      return remote.startsWith('promise new Promise')
        ? remote
        : (Federated.createRemote(remote) as T);
    }

    if (Array.isArray(remote)) {
      return remote.map((remoteItem) => this.replaceRemotes(remoteItem)) as T;
    }

    const replaced = {} as RemotesObject;
    for (const key in remote as RemotesObject) {
      const value = remote[key];
      if (typeof value === 'string' || Array.isArray(value)) {
        replaced[key] = this.replaceRemotes(value);
      } else {
        replaced[key] = {
          ...value,
          external: this.replaceRemotes(value.external),
        };
      }
    }

    return replaced as T;
  }

  private getDefaultSharedDependencies(): SharedObject {
    return {
      react: Federated.SHARED_REACT,
      'react-native': Federated.SHARED_REACT_NATIVE,
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
  private adaptSharedDependencies(
    shared: SharedDependencies
  ): SharedDependencies {
    const sharedDependencyConfig = (
      eager?: boolean,
      version?: string | false
    ) => ({
      singleton: true,
      eager: eager ?? true,
      version: version || '*',
      requiredVersion: version || '*',
    });

    const findSharedDependency = (
      name: string,
      dependencies: SharedDependencies
    ): SharedConfig | string | undefined => {
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
    const reactNativeVersion =
      typeof sharedReactNative === 'object'
        ? sharedReactNative.requiredVersion || sharedReactNative.version
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
            reactNativeVersion
          ),
        });
      }
      if (!findSharedDependency('@react-native/', shared)) {
        adjustedSharedDependencies.push({
          '@react-native/': sharedDependencyConfig(
            reactNativeEager,
            reactNativeVersion
          ),
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

  apply(compiler: RspackCompiler): void;
  apply(compiler: WebpackCompiler): void;

  apply(__compiler: unknown) {
    const compiler = __compiler as RspackCompiler;

    const ModuleFederationPlugin = this.getModuleFederationPlugin(compiler);

    const filenameConfig =
      this.config.filename ??
      (this.config.exposes
        ? `${this.config.name}.container.bundle`
        : undefined);

    const libraryConfig = this.config.exposes
      ? {
          name: this.config.name,
          type: 'self',
          ...this.config.library,
        }
      : undefined;

    const remotesConfig = Array.isArray(this.config.remotes)
      ? this.config.remotes.map((remote) => this.replaceRemotes(remote))
      : this.replaceRemotes(this.config.remotes ?? {});

    const sharedConfig = this.adaptSharedDependencies(
      this.config.shared ?? this.getDefaultSharedDependencies()
    );

    new ModuleFederationPlugin({
      ...this.config,
      filename: filenameConfig,
      library: libraryConfig,
      remotes: remotesConfig,
      shared: sharedConfig,
    }).apply(compiler);
  }
}
