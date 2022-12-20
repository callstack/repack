import { Compiler, container } from 'webpack';
import type { WebpackPlugin } from '../../types';
import { Federated } from '../federated';

type ModuleFederationPluginOptions =
  typeof container.ModuleFederationPlugin extends {
    new (options: infer O): InstanceType<
      typeof container.ModuleFederationPlugin
    >;
  }
    ? O
    : never;

type ExtractRemotesObject<T> = T extends {}
  ? T extends Array<any>
    ? never
    : T
  : never;

type RemotesObject = ExtractRemotesObject<
  ModuleFederationPluginOptions['remotes']
>;

/**
 * {@link ModuleFederationPlugin} configuration options.
 *
 * The fields and types are exactly the same as in `webpack.container.ModuleFederationPlugin`.
 *
 * You can check documentation for all supported options here: https://webpack.js.org/plugins/module-federation-plugin/
 */
export interface ModuleFederationPluginConfig
  extends ModuleFederationPluginOptions {}

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
export class ModuleFederationPlugin implements WebpackPlugin {
  constructor(private config: ModuleFederationPluginConfig) {}

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

  /**
   * Apply the plugin.
   *
   * @param compiler Webpack compiler instance.
   */
  apply(compiler: Compiler) {
    const remotes = Array.isArray(this.config.remotes)
      ? this.config.remotes.map((remote) => this.replaceRemotes(remote))
      : this.replaceRemotes(this.config.remotes ?? {});

    const config = {
      ...this.config,
      filename:
        this.config.filename ?? this.config.exposes
          ? `${this.config.name}.container.bundle`
          : undefined,
      library: this.config.exposes
        ? {
            name: this.config.name,
            type: 'self',
            ...this.config.library,
          }
        : undefined,
      shared: this.config.shared ?? {
        react: Federated.SHARED_REACT,
        'react-native': Federated.SHARED_REACT_NATIVE,
      },
      remotes,
    };

    if (config.library) {
      compiler.options.output.library = {
        ...compiler.options.output.library,
        ...config.library,
      };
    }

    new container.ModuleFederationPlugin(config).apply(compiler);
  }
}
