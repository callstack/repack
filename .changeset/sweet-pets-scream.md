---
"@callstack/repack": minor
---

__Custom Module Federation plugin - `Repack.plugins.ModuleFederationPlugin`__

Add custom `ModuleFederationPlugin` plugin with defaults for React Native, automatic `remotes`
conversion to `promise new Promise` (via `Federated.createRemote`) and support for `remote@location` syntax.

For example, instead of using `webpack.container.ModuleFederationPlugin`, you can now use:
```js
import * as Repack from '@callstack/repack';

new Repack.plugins.ModuleFederationPlugin({
  name: 'host',
});

new Repack.plugins.ModuleFederationPlugin({
  name: 'app1',
  remotes: {
    module1: 'module1@https://example.com/module1.container.bundle',
  },
});

new Repack.plugins.ModuleFederationPlugin({
  name: 'app2',
  remotes: {
    module1: 'module1@https://example.com/module1.container.bundle',
    module2: 'module1@dynamic',
  },
});
```

__Priority for resolvers in `ScriptManager`__

To support `remote@location` in `Repack.plugins.ModuleFederationPlugin`/`Federated.createRemote`, when adding
a resolver using `ScriptManager.shared.addResolver` you can optionally specify priority of that resolver.
By default all resolvers have priority of `2`.

When using `remote@location` syntax with valid URL as `location` (eg `module1@https://example.com/module1.container.bundle`), a default resolver for the container and it's chunks will be added with priority `0`.
If you want to overwrite it, add new resolver with higher priority.

To specify custom priority use 2nd options argument:
```js
import { ScriptManager } from '@callstack/repack/client';

ScriptManager.shared.addResolver(async (scriptId, caller) => {
  // ...
}, { priority: 1 }); // Default priority is `2`.
```

