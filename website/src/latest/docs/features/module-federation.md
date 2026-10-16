# Module Federation

Module Federation lets a host application load code from separately built remotes at runtime. Re.Pack supports Module Federation 2.0 through [`ModuleFederationPluginV2`](/api/plugins/module-federation-v2), which adds React Native defaults on top of the official `@module-federation/enhanced` plugin: shared `react` and `react-native`, the `loaded-first` share strategy, and runtime plugins that load remotes through [`ScriptManager`](/api/runtime/script-manager).

For the concepts and the limitations of microfrontends on mobile, read [Microfrontends](/docs/getting-started/microfrontends) first. For every plugin option, see the [`ModuleFederationPluginV2` reference](/api/plugins/module-federation-v2).

:::tip

Use [Glossary of terms](/docs/resources/glossary) to better understand the content of this documentation.

:::

## Usage

Install `@module-federation/enhanced` in the host and in every remote, as described in the [Installation](/api/plugins/module-federation-v2#installation) section of the plugin reference.

### Host

The host lists its remotes. Each remote points to the `mf-manifest.json` file that the remote's build emits:

```js title="rspack.config.cjs"
const Repack = require("@callstack/repack");

module.exports = (env) => {
  const { platform } = env;

  return {
    output: {
      // set uniqueName explicitly to make HMR work
      uniqueName: "host",
    },
    plugins: [
      new Repack.RepackPlugin(),
      new Repack.plugins.ModuleFederationPluginV2({
        name: "host",
        remotes: {
          module1: `module1@http://localhost:8082/${platform}/mf-manifest.json`,
        },
        shared: {
          react: { singleton: true, eager: true },
          "react-native": { singleton: true, eager: true },
        },
      }),
    ],
  };
};
```

You don't need to add a resolver with `ScriptManager.shared.addResolver`. The default resolver runtime plugin reads the manifest and resolves the remote's container and chunks for you.

### Remote

The remote exposes modules and names its container file:

```js title="rspack.config.cjs"
const Repack = require("@callstack/repack");

module.exports = {
  output: {
    // set uniqueName explicitly to make HMR work
    uniqueName: "module1",
  },
  plugins: [
    new Repack.RepackPlugin(),
    new Repack.plugins.ModuleFederationPluginV2({
      name: "module1",
      filename: "module1.container.js.bundle",
      exposes: {
        "./App": "./src/App",
      },
      shared: {
        react: { singleton: true, eager: false },
        "react-native": { singleton: true, eager: false },
      },
    }),
  ],
};
```

:::info

The container `name` must be a valid JavaScript identifier, for example `module1` or `miniApp`. The plugin throws an error for names like `mini-app`.

:::

### Loading a remote

Import exposed modules with a regular dynamic `import(...)`, using the remote name from the host's `remotes` and the key from the remote's `exposes`. `React.lazy` and `React.Suspense` work the same way as with [async chunks](/docs/features/code-splitting#async-chunks):

```jsx
import * as React from "react";
import { Text } from "react-native";

const RemoteApp = React.lazy(() => import("module1/App"));

export function RemoteScreen() {
  return (
    <React.Suspense fallback={<Text>Loading...</Text>}>
      <RemoteApp />
    </React.Suspense>
  );
}
```

A remote can fail to load, for example when its server is down. Wrap the `Suspense` in an error boundary so you can render a fallback instead of crashing the screen.

## Shared dependencies

`react` and `react-native` must be singletons: one copy for the host and all remotes. The host shares them with `eager: true`, so they are part of its main bundle and ready at startup. Remotes use `eager: false` and pick up the host's copy at runtime.

`eager` only applies to shared modules. Remotes are always loaded on demand.

:::caution

Setting `shared` replaces the default `react` and `react-native` entries. If you add your own shared dependencies, include `react` and `react-native` yourself.

:::

The default `requiredVersion` for `react` and `react-native` is `'*'`, which accepts any version. A remote built against a different version of React Native then fails at runtime instead of at build time. Pin `requiredVersion` to the version the host ships:

```js title="rspack.config.cjs"
const reactPkg = require("react/package.json");
const reactNativePkg = require("react-native/package.json");

new Repack.plugins.ModuleFederationPluginV2({
  name: "host",
  shared: {
    react: {
      singleton: true,
      eager: true,
      requiredVersion: reactPkg.version,
    },
    "react-native": {
      singleton: true,
      eager: true,
      requiredVersion: reactNativePkg.version,
    },
  },
});
```

## Development

Each app runs its own dev server on its own port. The host reaches a remote through the port in the remote URL, so in the example above the remote has to run on port `8082`:

```bash
# host, default port
npx react-native start

# remote
npx react-native start --port 8082
```

## Migrating from V1

`ModuleFederationPluginV1` will be removed in the next major. To move to V2:

1. Install `@module-federation/enhanced` and replace `ModuleFederationPluginV1` with `ModuleFederationPluginV2` in every config.
2. Point remotes to the manifest instead of the container bundle:

   ```diff
    remotes: {
   -  module1: "module1@https://example.com/module1.container.bundle",
   +  module1: `module1@https://example.com/${platform}/mf-manifest.json`,
    },
   ```

3. Remove `Federated.SHARED_REACT`, `Federated.SHARED_REACT_NATIVE` and `Federated.createRemote` from the config, and `Federated.createURLResolver` and `Federated.importModule` from the app. Remotes resolve through the manifest and load with a regular `import(...)`.
4. Rename containers whose `name` is not a valid JavaScript identifier, for example `mini-app` to `miniApp`.

## Examples

- [Super App Showcase](https://github.com/callstack/super-app-showcase) - a host app that loads mini apps with Module Federation.
- [Tester app](https://github.com/callstack/repack/tree/main/apps/tester-federation-v2) - the host and mini app setup Re.Pack uses to test Module Federation 2.0.
