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

export interface ModuleFederationPluginConfig
  extends ModuleFederationPluginOptions {}

export const SHARED_REACT = {
  react: {
    singleton: true,
    eager: true,
  },
};

export const SHARED_REACT_NATIVE = {
  'react-native': {
    singleton: true,
    eager: true,
  },
};

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

  apply(compiler: Compiler) {
    const remotes = Array.isArray(this.config.remotes)
      ? this.config.remotes.map((remote) => this.replaceRemotes(remote))
      : this.replaceRemotes(this.config.remotes ?? {});

    new container.ModuleFederationPlugin({
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
        ...SHARED_REACT,
        ...SHARED_REACT_NATIVE,
      },
      remotes,
    }).apply(compiler);
  }
}
