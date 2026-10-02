# defineShared

Build a Module Federation `shared` configuration map whose `version` and `requiredVersion` pins are resolved from the packages **actually installed** at bundler-config evaluation time. Use it in host and remote configs so the shared pins are never hand-committed literals and cannot drift by typo between apps.

## Parameters

```ts
function defineShared(
  deps: DefineSharedDeps,
  options?: {
    context?: string; // default: process.cwd()
    role?: 'host' | 'remote'; // default: 'host'
    mode?: 'federated' | 'standalone'; // default: 'federated'
  }
): Record<string, SharedEntry>;
```

### deps

- Type: `string | Array<string | Record<string, SharedDepConfig | string> | ({ name: string } & SharedDepConfig)> | Record<string, SharedDepConfig | string>`
- Required: `true`

The shared dependency names, in any of the shapes the federation plugins accept. Any per-dependency config keys (`import`, `shareScope`, …) are passed through to the plugin untouched.

### options.context

Directory from which installed versions are resolved. Defaults to the process working directory — pass `env.context` from the config so each app resolves its own dependency tree.

### options.role

Drives the `eager` convention when an entry does not set `eager` explicitly: `host` → `eager: true`, `remote` → `eager: false`. Defaults to `'host'`.

### options.mode

`'standalone'` forces `eager: true` on every entry regardless of role — the mode used when a remote is built/run alone via `--standalone`. Derive it from the runtime flag, never from a committed file: `mode: env.argv?.standalone ? 'standalone' : 'federated'`.

## Behavior

- Every entry gets `singleton: true` and the exact installed version as both `version` and `requiredVersion`; user-provided `version`/`requiredVersion` values are overwritten by the installed pin.
- An explicit `singleton`/`eager` in the user config wins over the convention.
- Keys ending in `/` (deep-import markers like `react-native/`) are emitted verbatim and never version-resolved; `defineShared` never adds them — the federation plugins already do.
- A dependency that cannot be resolved to an installed package throws `SharedDependencyUnresolvedError` naming the package and the context, failing the config evaluation loudly. No placeholder or range is ever substituted.

## Example

```js title=rspack.mini-app.mjs
import * as Repack from "@callstack/repack";

const SHARED_DEPS = ["react", "react-native"];

export default Repack.defineRspackConfig((env) => ({
  // ... config
  plugins: [
    new Repack.plugins.ModuleFederationPluginV1({
      name: "miniApp",
      // ... exposes/remotes
      shared: Repack.defineShared(SHARED_DEPS, {
        context: env.context,
        role: "remote",
        mode: env.argv?.standalone ? "standalone" : "federated",
      }),
    }),
  ],
}));
```

When host and remote resolve the same installed copies, both sides emit identical pins by construction. When split checkouts resolve different copies, each side pins what it actually sees — `federation-doctor` gates the divergence.
