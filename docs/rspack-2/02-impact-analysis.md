# Re.Pack Codebase Impact Analysis for Rspack 2.0

Findings from a full audit of `packages/*` against the breaking-changes inventory
([01](./01-breaking-changes-inventory.md)). Organized by severity.

## Confirmed breaks (Rspack 2 build fails or code throws)

### 1. `experiments.parallelLoader` injection — config validation error

`packages/repack/src/commands/common/config/getRepackConfig.ts:3-7`

```ts
function getExperimentsConfig(bundler: 'rspack' | 'webpack') {
  if (bundler === 'rspack') {
    return { parallelLoader: true };
  }
}
```

Rspack 2 removed `experiments.parallelLoader` ([PR #12658](https://github.com/web-infra-dev/rspack/pull/12658))
and enables config validation by default → **every Rspack 2 build fails at startup with a
schema validation error**. Parallel loading is still opt-in per rule via
`module.rules[].use[].parallel` (which we don't currently set — the experiment flag alone
never parallelized our loaders; users had to add `parallel: true` to rules themselves).

Related soft spot: `packages/repack/src/loaders/babelSwcLoader/utils.ts:93-107`
(`checkParallelModeAvailable`) reads `loaderContext._compiler.options?.experiments?.parallelLoader`
to warn users. Under v2 the key never exists, so the warning silently never fires — benign,
but the message links to the v1 docs and should become version-aware.

### 2. `ReactRefreshPlugin.deprecated_runtimePaths` — removed in plugin v2

`packages/repack/src/plugins/DevelopmentPlugin.ts:8-13`

```ts
import ReactRefreshPlugin from '@rspack/plugin-react-refresh';

const [reactRefreshEntryPath, reactRefreshPath, refreshUtilsPath] =
  ReactRefreshPlugin.deprecated_runtimePaths;
```

This runs at **module load time** (top level), so if the installed plugin is v2 it throws
immediately for every command, both bundlers. Verified against published tarballs:

- `@rspack/plugin-react-refresh@1.0.0`: `ReactRefreshRspackPlugin.deprecated_runtimePaths = runtimePaths` ✅
- `@rspack/plugin-react-refresh@2.0.2`: static removed; paths are computed internally via
  `import.meta.dirname`; package is `"type": "module"`; client files still shipped
  (`client/reactRefresh.js`, `client/reactRefreshEntry.js`, `client/refreshUtils.js`) but
  **only `./react-refresh` and `./react-refresh-entry` are in the exports map** —
  `client/refreshUtils.js` is not deep-importable in v2.

Mitigating facts:

- Re.Pack declares `"@rspack/plugin-react-refresh": "1.0.0"` as a **regular dependency**
  (`packages/repack/package.json:85`), so today users always get v1 regardless of their
  Rspack version.
- The v1 plugin line (`1.0.0`–`1.6.2`) has **no `@rspack/core` peer dependency** (only an
  optional `react-refresh` peer), so v1 installs cleanly next to Rspack 2.
- We never `apply()` the plugin — we only harvest its 3 client runtime files and wire them
  manually (`DevelopmentPlugin.ts:124-161`), so plugin-vs-core version coupling is minimal.
  The client files interact with the standard `module.hot` API, not version-specific internals.

### 3. Persistent cache config: `experiments.cache` → top-level `cache`

Value reads (break `--reset-cache` cache-dir detection for v2 configs):

- `packages/repack/src/commands/rspack/start.ts:61` — `configs.map((config) => config.experiments?.cache)`
- `packages/repack/src/commands/rspack/bundle.ts:54` — `cacheConfigs: [config.experiments?.cache]`

Type break (fails compilation against v2 types):

- `packages/repack/src/commands/common/resetPersistentCache.ts:7-9`

```ts
type RspackCacheOptions = NonNullable<
  RspackConfiguration['experiments']
>['cache'];   // 'cache' no longer exists on Experiments in v2 types
```

Under v2, users configure `cache: { type: 'persistent', storage: { directory } }` at the
top level ([PR #12705](https://github.com/web-infra-dev/rspack/pull/12705)). Fix is simple:
read `config.cache ?? config.experiments?.cache` and widen the type.

## Structural: ESM-only `@rspack/core` + Node floor

`packages/repack` is `"type": "commonjs"`; Babel compiles `import { rspack } from '@rspack/core'`
to `require("@rspack/core")` in `dist/` (e.g. `dist/commands/rspack/Compiler.js:4`).

With `@rspack/core@2` (`"type": "module"`, verified on npm):

- On Node **≥20.19 / ≥22.12** — exactly what Rspack 2 requires anyway — `require(esm)`
  loads it fine. Node marks the returned namespace for Babel's interop, so both named
  (`_core.rspack`) and default-import patterns should work. **Needs a smoke test** (listed
  in [04](./04-questions-and-blockers.md)).
- On Node 18, `require("@rspack/core")` throws `ERR_REQUIRE_ESM` — but Node 18 users can't
  run Rspack 2 regardless. Rspack 1 users on Node 18 are unaffected (v1 ships CJS).

Places that load `@rspack/core` at runtime (all fine on supported Node versions):

- `packages/repack/src/commands/rspack/{Compiler,bundle,start}.ts` — static import → CJS require
- `packages/repack/src/commands/common/config/getMinimizerConfig.ts:43` — `await import('@rspack/core')` (already ESM-safe)
- `packages/repack/src/loaders/babelSwcLoader/utils.ts:139-142` — resolves user's
  `@rspack/core` and loads via `importDefaultESM` helper (already ESM-safe), then reads
  `rspack.experiments?.swc` — **verify `experiments.swc` still exists on the v2 JS API**.

TypeScript is already `module: "nodenext"` (`tsconfig.base.json:4-5`), which resolves
ESM-only package types correctly. The open question is which major we *compile against*
(see [04 §types](./04-questions-and-blockers.md)).

## Version-sensitive but currently compatible

### Version detection precedent

`packages/repack/src/commands/rspack/profile/index.ts:1-16` already branches on
`rspackVersion` from `@rspack/core` (`profile-1.4.ts` vs `profile-legacy.ts`). This is the
pattern to generalize for dual support. (**Verify `rspackVersion` is still exported by v2**
— expected yes, it exists for webpack-compat.)

### Minimizer selection

`getMinimizerConfig.ts` currently prefers Terser for all Rspack versions except exactly
`1.4.11` (`shouldUseTerserForRspack`). Under v2 this silently picks Terser — works, but
leaves the v2 SwcJsMinimizer improvements (~50% faster cached minify) on the table.
Revisit as an opportunity, not a break.

### Module Federation

- `ModuleFederationPluginV1.ts:122-125` resolves Rspack's built-in
  `compiler.webpack.container.ModuleFederationPluginV1`. Still present in v2, **but**
  `@module-federation/runtime-tools` became an optional peer of `@rspack/core@2`
  ([PR #12663](https://github.com/web-infra-dev/rspack/pull/12663)) — users hitting MFv1 on
  Rspack 2 without installing it get a raw resolution error. We should pre-check and throw
  a friendly error (we already have this pattern in `ModuleFederationPluginV2.ensureModuleFederationPackageInstalled`).
- `ModuleFederationPluginV2.ts:169-173` requires `@module-federation/enhanced/rspack`.
  Compatibility with Rspack 2 is governed by the user's `@module-federation/enhanced`
  version (Rspack 2 peer allows `runtime-tools ^0.24.1 || ^2.0.0`; enhanced 2.x is current).
  Needs a compatibility matrix check in [04](./04-questions-and-blockers.md).
- Federation runtime plugins (`packages/repack/src/modules/FederationRuntimePlugins/*`)
  only use `@module-federation/enhanced/runtime` types + `ScriptManager` — unaffected.

### Runtime globals & HMR — verified safe by construction

- `RepackTargetPlugin.ts:51-53` pins `chunkLoading: 'jsonp'`, `chunkFormat: 'array-push'`,
  `globalObject`. The renamed defaults (`webpackChunk*` → `rspackChunk*`,
  `webpackHotUpdate*` → `rspackHotUpdate*`) only appear inside Rspack-generated code, which
  is consistent within a build. No Re.Pack source hardcodes either name (audited).
- `WebpackHMRClient.ts:97` uses `__webpack_hash__`; runtime modules build on
  `__webpack_require__` (init/loadScript/guardedRequire implementations,
  `getWebpackContext.ts:7`). Rspack 2 keeps webpack-compatible runtime global names
  (`__webpack_require__` etc.) — these are not part of the announced breaking changes.
  Covered by integration testing rather than code changes.

### Stats

All `stats.toJson()` calls pass explicit option objects
(`LoggerPlugin.ts:157`, `OutputPlugin.ts:194`, `rspack/Compiler.ts:126`) — unaffected by
the new sparse defaults. `bundle --json` passes user-derived `statsOptions`
(`normalizeStatsOptions`), so the *content* of a user's `stats.json` may shrink under v2
defaults — documentation note, not a bug.

## Explicitly audited — no usage found

- `output.libraryTarget` / `libraryExport` / `umdNamedDefine` / `auxiliaryComment`
- `output.charset`, `trustedTypes`, `bundlerInfo`, `optimization.removeAvailableModules`
- `module.unsafeCache`, `strictExportPresence`, `exportsPresence` (we don't set it — see
  user-facing concern in [04](./04-questions-and-blockers.md))
- `RuntimeModule.constructorName` / `.moduleIdentifier`, `plugin.getHooks`,
  `readResourceForScheme`, `loaderContext._module`
- `HtmlRspackPlugin`, `SubresourceIntegrityPlugin`, `LightningCssMinimizerRspackPlugin`,
  `WarnCaseSensitiveModulesPlugin`, `EsmLibraryPlugin`
- `.swcrc` files (none in repo; all SWC config is inline loader options)
- `resolve.roots`, `.wasm` extensions (we fully override `extensions`/`byDependency` in
  `getResolveOptions.ts`)

## Dependency & environment surface (from packaging audit)

| Location | Current value | Rspack 2 consideration |
| --- | --- | --- |
| `packages/repack/package.json` peers | `@rspack/core: >=1` (optional), `webpack: >=5.90` (optional), `@module-federation/enhanced: >=0.6.10` (optional) | `>=1` already admits v2 — good; needs real support behind it |
| `packages/repack/package.json` deps | `@rspack/plugin-react-refresh: 1.0.0` (exact pin) | Keep on v1 line or replace with manual path resolution ([03](./03-dual-version-support-plan.md#react-refresh)) |
| `engines.node` (repack, dev-server, init, plugins) | `>=18` | Rspack 2 needs ≥20.19; policy decision in [04](./04-questions-and-blockers.md) |
| `pnpm-workspace.yaml` catalog | `@rspack/core: ^1.6.0` | Needs a second catalog entry or bump for v2 testing |
| `packages/init/src/versions.json` | `@rspack/core: ^1.7.8` | Decide default for newly-initialized projects |
| CI `test-main-matrix.yml` | Node `['18','20','22','24']` | Node 18 lane can't run Rspack 2 suites |
| tester apps / tests | `@rspack/core: catalog:` (v1) | Need v2 variants or a matrix dimension |

`@callstack/repack-dev-server` and `@callstack/repack-init` are already pure ESM;
plugin packages (`plugin-nativewind`, `plugin-reanimated`, `plugin-expo-modules`) are CJS
but only use `@rspack/core` **types** — no runtime break.
