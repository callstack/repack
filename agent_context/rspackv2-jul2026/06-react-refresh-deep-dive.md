# Deep dive: `deprecated_runtimePaths` and the React Refresh integration

Context for break №2 in [02-impact-analysis.md](./02-impact-analysis.md): what the API is,
why Re.Pack depends on it, why upstream removed it in v2, and the better v2-supported
approach to replace it.

Verified against published tarballs
([`@rspack/plugin-react-refresh@1.0.0`](https://www.npmjs.com/package/@rspack/plugin-react-refresh/v/1.0.0)
and [`@2.0.2`](https://www.npmjs.com/package/@rspack/plugin-react-refresh/v/2.0.2)) and
upstream history:

- Removal PR: [rstackjs/rspack-plugin-react-refresh#95](https://github.com/rstackjs/rspack-plugin-react-refresh/pull/95) — "fix: remove deprecated static method for runtime paths" (merged 2026-04-07, part of v2.0.0)
- ESM migration: [rstackjs/rspack-plugin-react-refresh#91](https://github.com/rstackjs/rspack-plugin-react-refresh/pull/91)
- The static existed since at least Nov 2023 (visible pre-existing in [web-infra-dev/rspack#4486](https://github.com/web-infra-dev/rspack/pull/4486), back when the plugin lived in the rspack monorepo and its refresh utils were still sourced from `@pmmmwh/react-refresh-webpack-plugin`)

## What `deprecated_runtimePaths` is

A static property on the v1 plugin class exposing its four internal client-runtime file
paths, so integrators could rebuild the plugin's wiring themselves:

```js
// @rspack/plugin-react-refresh@1.x — dist/index.js
const runtimePaths = [
  reactRefreshEntryPath,   // client/reactRefreshEntry.js — injects react-refresh into the global hook, must run FIRST
  reactRefreshPath,        // client/reactRefresh.js — the $ReactRefreshRuntime$ facade (refresh/register/createSignatureFunctionForTransform)
  refreshUtilsPath,        // client/refreshUtils.js — module.hot bookkeeping, exports comparison, performReactRefresh()
  refreshRuntimeDirPath,   // dirname of react-refresh/runtime (for resolve.alias)
];
ReactRefreshRspackPlugin.deprecated_runtimePaths = runtimePaths;
```

The `deprecated_` prefix was there from day one — it was never a supported API, but an
escape hatch acknowledging that the plugin wasn't configurable enough for integrators.

## What Re.Pack uses it for — and why it bypasses the plugin

Re.Pack never calls `plugin.apply()`. `DevelopmentPlugin` harvests the first three paths
and **re-implements the plugin's wiring by hand** (`DevelopmentPlugin.ts:124-161`), because
the v1 plugin can't accommodate three React Native requirements:

| Requirement | v1 plugin behavior | What Re.Pack needs |
| --- | --- | --- |
| **Entry placement** | Always injects `reactRefreshEntry` as a *global, unnamed* entry (`EntryPlugin(..., { name: undefined })`) — no way to disable or control ordering | Dev entries added **per named entrypoint** (including Module Federation containers), in the exact order `[reactRefreshEntry, configurePublicPath, WebpackHMRClient]`; on webpack, additionally reordered around the MF `.federation/entry` (`DevelopmentPlugin.ts:183-199`) |
| **Loader** | Hardcodes `builtin:react-refresh-loader` — a native Rspack loader that **doesn't exist in webpack** | One loader for both bundlers: `@callstack/repack/react-refresh-loader`, a JS port that also accounts for RN runtime specifics (`setImmediate` guard before refresh) |
| **Error overlay** | Web-oriented error overlay + dev-server socket integration on by default | Meaningless in React Native — Re.Pack stubs it via `DefinePlugin({ __react_refresh_error_overlay__: false, __react_refresh_socket__: false })` |

So Re.Pack's manual wiring is a faithful mirror of the v1 plugin's internals: the same
`ProvidePlugin({ $ReactRefreshRuntime$ })`, `ProvidePlugin({ __react_refresh_utils__ })`,
`DefinePlugin({ __react_refresh_library__ })`, and `resolve.alias['react-refresh']` — just
with RN-appropriate values and its own entry/loader handling. The runtime paths were the
only piece it couldn't produce itself, hence the dependency on the escape hatch.

## Why upstream removed it

Two reasons, both visible in the v2 source:

**1. It leaked internals that v2 changed incompatibly.** The paths were only useful if you
also replicated the plugin's wiring — and that wiring contract is exactly what changed:

| Internal contract | v1 | v2 |
| --- | --- | --- |
| Client file module format | CommonJS (`require`/`module.exports`) | ESM (`import`/`export`) |
| Defines expected by `refreshUtils.js` | `__react_refresh_library__`, `__react_refresh_error_overlay__`, `__react_refresh_socket__` | `__react_refresh_library__`, `__reload_on_runtime_errors__` (overlay/socket **removed entirely** — the overlay client files no longer ship) |
| Runtime requirements | implicit | plugin explicitly taps `additionalTreeRuntimeRequirements` to add `RuntimeGlobals.moduleCache` (refreshUtils reads `__webpack_require__.c`) |
| Deep-import surface | any file reachable | strict `exports` map: only `./react-refresh` and `./react-refresh-entry` exposed; `client/refreshUtils.js` is **not** importable by subpath |
| Plugin export | CJS default (`module.exports = class`) | **named export only** (`export { ReactRefreshRspackPlugin }`) — our `import ReactRefreshPlugin from ...` default import breaks too |

Consuming files by path while hand-rolling the wiring invites exactly this version skew —
which is why the paths were never a safe public API.

**2. v2 made the escape hatch unnecessary.** The v2 plugin added first-class integrator
options (from `dist/options.d.ts`):

```ts
type PluginOptions = {
  injectEntry?: boolean;          // default true — set false to control entry placement yourself
  injectLoader?: boolean;         // default true — set false to skip the loader rule entirely
  reactRefreshLoader?: string;    // default 'builtin:react-refresh-loader' — swap in a custom loader
  test?: RuleSetCondition;        // loader rule conditions now configurable
  include?: RuleSetCondition | null;
  exclude?: RuleSetCondition | null;
  resourceQuery?: RuleSetCondition;
  library?: string;               // falls back to output.uniqueName || output.library (same as our manual define)
  forceEnable?: boolean;
  reloadOnRuntimeErrors?: boolean;
};
```

Every reason Re.Pack had for bypassing the plugin now has a supported knob:
`injectEntry: false` covers the entry-placement problem, `reactRefreshLoader` covers the
custom loader, and the overlay problem evaporated because v2 deleted the overlay.

## The better approach for Re.Pack

> ✅ **DECIDED (2026-07-02).** Drop the `@rspack/plugin-react-refresh@1.0.0` dependency
> entirely. Architecture:
>
> - **Rspack ≥ 2** → apply the official v2 plugin with `injectEntry: false` +
>   `reactRefreshLoader` (target-state code below); entry from the supported
>   `/react-refresh-entry` subpath. The plugin becomes an **optional peerDependency**
>   (`^2`) with a friendly install pre-check (same pattern as `@module-federation/enhanced`);
>   `repack-init` adds it by default since new projects default to Rspack 2 (Q3).
>   The plugin must be **lazily required inside the rspack≥2 branch** — it's ESM-only, and
>   a top-level import would crash Node 18 users even on webpack; the branch is guarded by
>   the Q2 Node ≥ 20.19 runtime check, where `require(esm)` works.
> - **Rspack 1 + webpack** → vendor the three client files (adapted from v2, MIT,
>   overlay-free) into `packages/repack/src/modules`; keep today's manual wiring pointed at
>   them, swapping the removed overlay defines for `__reload_on_runtime_errors__: false`.
>   *(Location later amended per maintainer feedback #2: package-root
>   `vendor/react-refresh/` shipped as-is, with a LICENSE/provenance file — doc 10 §2.)*
>   No `moduleCache` tap needed — today's manual wiring already works without it on
>   rspack 1/webpack.
> - **No interim step** — this lands directly in the dual-support release. When Rspack 1
>   support ends at the next major (Q5), the vendored path becomes webpack-only with no
>   rework.

### Rspack ≥ 2 branch: apply the plugin with integrator options

```ts
// DevelopmentPlugin.ts — inside the rspack≥2 branch (NOT top-level: package is ESM-only,
// safe here because the Node ≥20.19 guard has already run and require(esm) works)
const { ReactRefreshRspackPlugin } = require('@rspack/plugin-react-refresh'); // named export in v2

new ReactRefreshRspackPlugin({
  injectEntry: false, // we inject the entry ourselves, per entrypoint, in our required order
  reactRefreshLoader: '@callstack/repack/react-refresh-loader', // RN-specific footer
  test: /\.([cm]js|[jt]sx?|flow)$/i, // match our current rule conditions
  exclude: /node_modules/i,
}).apply(compiler);

// entry path via the v2 exports map — a SUPPORTED subpath, not an internal file:
const reactRefreshEntryPath = require.resolve(
  '@rspack/plugin-react-refresh/react-refresh-entry'
);
const devEntries = [
  reactRefreshEntryPath,
  require.resolve('../modules/configurePublicPath.js'),
  require.resolve('../modules/WebpackHMRClient.js'),
];
// ... existing per-entrypoint EntryPlugin loop unchanged
```

The plugin then owns everything that was previously copy-pasted wiring: the
`$ReactRefreshRuntime$` / `__react_refresh_utils__` provides, the
`__react_refresh_library__` / `__reload_on_runtime_errors__` defines, the `react-refresh`
alias, the loader rule (using **our** loader), and the `moduleCache` runtime requirement.
Version skew between client files and wiring becomes impossible — that's the whole point
of the supported options.

Deletions this enables in `DevelopmentPlugin`: both `ProvidePlugin` calls, the refresh
`DefinePlugin` call, the `resolve.alias` patch, and the manual loader-rule unshift
(~30 lines), for the rspack branch.

### Rspack 1 + webpack branch: vendored client files + today's manual wiring

The v2 plugin is rspack-2-only for us (it calls `compiler.rspack.*`, is ESM-only, and
peer-requires core `^2`), so the Rspack 1 and webpack paths keep the existing manual
wiring — with the client files **vendored into Re.Pack** instead of harvested from the v1
package:

- Adapt the three v2 client files (MIT, originally ported from
  `@pmmmwh/react-refresh-webpack-plugin`; RN needs no overlay so it's ~150–200 lines total)
  into `packages/repack/src/modules`, next to `WebpackHMRClient`. *(Amended per
  maintainer feedback #2: they live at package-root `vendor/react-refresh/`,
  shipped as-is — doc 10 §2.)*
- Manual wiring changes only in the defines: drop
  `__react_refresh_error_overlay__` / `__react_refresh_socket__` (v1-file contract), add
  `__reload_on_runtime_errors__: false` (v2-file contract).
- The loader footer contract (`$ReactRefreshRuntime$.refresh/register/createSignatureFunctionForTransform`)
  is satisfied by the v2 files unchanged (verified).
- Vendoring is also the escape valve if upstream ever changes the v2 option surface.

### Implementation notes

- **Dependency shape:** `@rspack/plugin-react-refresh@1.0.0` regular dep → deleted.
  `@rspack/plugin-react-refresh@^2` → optional peerDependency + install pre-check in the
  rspack≥2 branch (mirror `ModuleFederationPluginV2.ensureModuleFederationPackageInstalled`).
- **Lazy require:** `const { ReactRefreshRspackPlugin } = require('@rspack/plugin-react-refresh')`
  *inside* the rspack≥2 branch only — never top-level (ESM-only package; Node 18
  webpack/rspack-1 users must never evaluate it).
- **Sunset path:** at Re.Pack's next major (Rspack 1 support ends per Q5), the vendored
  path becomes webpack-only; no rework needed.

### Watch-outs when adopting the v2 plugin

- **Named export**: `import { ReactRefreshRspackPlugin } from ...` — the default import
  returns `undefined` in v2.
- **Loader footer compatibility**: our loader's footer calls
  `$ReactRefreshRuntime$.refresh/register/createSignatureFunctionForTransform` — all three
  are still exported by v2's `client/reactRefresh.js` (verified), so the footer is
  unchanged.
- **`library` option**: omit it — the v2 plugin falls back to
  `output.uniqueName || output.library`, which is exactly what our manual
  `__react_refresh_library__` define computes today.
- **Mode gating**: the plugin no-ops unless `mode === 'development'` (or `forceEnable`).
  Our `DevelopmentPlugin` already only wires refresh when `devServer.hot` is set — keep
  that outer gate, it's stricter.
- **`reloadOnRuntimeErrors`**: new v2 behavior knob (full reload on runtime errors,
  default `false`). Default matches current behavior; worth evaluating later as a DX
  improvement for RN (a "reload app on unrecoverable HMR error" toggle).
