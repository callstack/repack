# Plan: Supporting Rspack 1.x and 2.x Simultaneously

Goal: one `@callstack/repack` release line that works with the user's installed
`@rspack/core`, whether that's 1.x or 2.x. Peer dependency already allows it
(`"@rspack/core": ">=1"`); this plan makes it true.

## Guiding decisions

1. **Runtime version detection, not separate builds.** Branch on the user's installed
   Rspack major, following the existing precedent in
   `packages/repack/src/commands/rspack/profile/index.ts`.
2. **Compile against Rspack 2 types**, keep runtime code working on both. v2's
   `Configuration` is close to a superset of what we use once the confirmed breaks are
   fixed; the few v1-only reads (e.g. `experiments.cache`) get widened types.
3. **Don't raise `engines.node` beyond what Rspack 1 users need.** Enforce the Node
   ≥20.19/≥22.12 floor *at runtime, only when Rspack 2 is detected*, with a clear error.

## Phase 0 — Foundations

### 0.1 Version helper

Add a shared helper (e.g. `packages/repack/src/helpers/rspackVersion.ts`):

```ts
import { rspackVersion } from '@rspack/core';

export function getRspackMajor(): number {
  return Number(rspackVersion.split('.')[0]);
}

export function isRspack2(): boolean {
  return getRspackMajor() >= 2;
}
```

Refactor `commands/rspack/profile/index.ts` to use it. For code paths that can't import
`@rspack/core` directly (webpack-only flows), detect lazily from the resolved package.

### 0.2 Workspace scaffolding for testing both majors

- Add `@rspack/core` v2 to the pnpm catalog (e.g. `catalog:rspack2` named catalog or
  explicit versions in the apps that test v2).
- Decide the default for `apps/tester-app` (suggest: v2, since that's the future) and keep
  at least one app/test suite on v1.

## Phase 1 — Fix the confirmed breaks

### 1.1 `experiments.parallelLoader` (config generation)

`getRepackConfig.ts`:

```ts
function getExperimentsConfig(bundler: 'rspack' | 'webpack') {
  if (bundler === 'rspack' && !isRspack2()) {
    return { parallelLoader: true };
  }
  // Rspack 2: parallelLoader is stable & removed from experiments;
  // per-rule `use[].parallel` remains the opt-in — nothing to set globally.
}
```

Also update `babelSwcLoader/utils.ts` `checkParallelModeAvailable` so the warning text and
`experiments.parallelLoader` probe are version-aware (under v2 just skip the probe — the
per-rule `parallel` flag is the only signal).

### 1.2 Persistent cache (`--reset-cache`)

`start.ts` / `bundle.ts`:

```ts
cacheConfigs: [config.cache ?? config.experiments?.cache]
```

`resetPersistentCache.ts`: widen `RspackCacheOptions` so it doesn't derive from
`experiments` (define a minimal structural type: `boolean | { type?: string; storage?: { directory?: string } }`).
The path-extraction logic (`storage.directory`) is unchanged between majors.

### 1.3 React Refresh <a name="react-refresh"></a>

> ✅ **Decided 2026-07-02** — full background and rationale in
> [06-react-refresh-deep-dive.md](./06-react-refresh-deep-dive.md). No interim step; this
> lands directly in the dual-support release.

Drop the `@rspack/plugin-react-refresh@1.0.0` dependency entirely; split by bundler/major:

- **Rspack ≥ 2**: apply the official v2 plugin with `injectEntry: false` +
  `reactRefreshLoader: '@callstack/repack/react-refresh-loader'`; inject the entry
  ourselves from the supported `@rspack/plugin-react-refresh/react-refresh-entry` subpath.
  The plugin becomes an **optional peerDependency (`^2`)** with a friendly install
  pre-check; `repack-init` adds it by default (new projects default to Rspack 2, Q3).
  Require it **lazily inside the rspack≥2 branch** — the package is ESM-only, so a
  top-level import would crash Node 18 users even on webpack; inside the branch the §1.4
  Node guard guarantees `require(esm)` works.
- **Rspack 1 + webpack**: keep today's manual wiring, pointed at the three client files
  **vendored into `packages/repack/src/modules`** (adapted from the v2 files, MIT,
  overlay-free); swap the removed overlay defines for `__reload_on_runtime_errors__: false`.
- At the next major (Rspack 1 support ends, Q5) the vendored path becomes webpack-only.

Also make all refresh wiring lazy (inside `apply()`), not at module top level — today a
resolution failure crashes even webpack-only commands.

### 1.4 Runtime guard for Node version

When `isRspack2()` and `process.version` < 20.19 (or 22.0–22.11), fail fast in the rspack
commands with an actionable message ("Rspack 2 requires Node ^20.19.0 || >=22.12.0 — found
X; upgrade Node or use @rspack/core@1"). This converts an obscure `ERR_REQUIRE_ESM` /
engine crash into a supported-configuration error.

## Phase 2 — Compatibility hardening

### 2.1 Types

- Bump the repo devDependency/catalog used for compilation to `@rspack/core@^2`.
- Fix resulting type errors (known: `resetPersistentCache.ts`; likely: a few
  `Configuration`-shaped helpers). Where v1-only shapes are read at runtime, use widened
  local types instead of `@ts-expect-error`.
- Public API check: our exported types (`RspackConfig` etc.) will describe v2. Document
  that v1 users may see minor type mismatches for removed experiment keys (values still
  work at runtime under v1 — validation only rejects *unknown* keys per-major, and we only
  emit keys valid for the detected major).

### 2.2 Config-generation review under v2 semantics

- `getRepackConfig`: `devtool: 'source-map'`, `output.*`, `optimization.chunkIds` — all
  still valid in v2; add an integration assertion that generated config passes v2 schema
  validation for both `mode`s.
- Target propagation ([PR #12752](https://github.com/web-infra-dev/rspack/pull/12752)):
  confirm our per-rule SWC `env`/`jsc` options override the propagated top-level target,
  and that `RepackTargetPlugin`'s target handling doesn't produce surprising SWC/browserslist
  defaults. Add explicit loader targets if needed.
- `exportsPresence`: **decided (Q1)** — set
  `module.parser.javascript.exportsPresence: 'auto'` in `getRepackConfig` for Rspack 2 to
  preserve Metro-like tolerance; document as overridable.

### 2.3 Module Federation

- `ModuleFederationPluginV1`: pre-flight `require.resolve('@module-federation/runtime-tools', { paths: [context] })`
  when running under Rspack 2 and throw a friendly install hint (mirror
  `ModuleFederationPluginV2.ensureModuleFederationPackageInstalled`).
- Establish and document the supported `@module-federation/enhanced` version range per
  Rspack major; run `tester-federation` and `tester-federation-v2` against both majors.

### 2.4 Minimizer

Extend `shouldUseTerserForRspack` (rename to a positive `getRspackMinimizer` decision):
evaluate `SwcJsMinimizerRspackPlugin` on 2.x — upstream reports ~50% faster cached
minification. If output parity holds for RN bundles (hermes-safe output, comments
stripping), prefer it for v2 and keep Terser for 1.x.

### 2.5 Tracing/profiling

Verify the `--trace-*` flow (`profile-1.4.ts`) against v2's tracing implementation; add a
`profile-2.ts` variant if the env-var/layer contract changed.

## Phase 3 — Validation surfaces & CI

- **Matrix:** run integration tests against `@rspack/core@^1` and `@rspack/core@^2`
  (pnpm override or per-fixture installs). Node lanes: 18/20 stay v1-only; v2 suites run
  on 20.19+/22/24.
- `tests/metro-compat`: full sweep under v2 — this is where `requireAlias`
  (aliased dynamic require) and `exportsPresence` regressions will surface.
- `tests/resolver-cases`: run under v2 to confirm explicit resolve options fully mask the
  resolver default changes.
- Manual validation: `tester-app` dev-server flow (HMR/React Refresh, chunk loading via
  ScriptManager, remote debugging) on iOS + Android under v2.

## Phase 4 — Docs, templates, release

- `templates/rspack.config.{cjs,mjs}`: verify against v2 (they set no `experiments`, so
  likely fine as-is).
- `packages/init/src/versions.json`: **decided (Q3)** — new projects default to
  `@rspack/core@^2` once the validation pass is green (init could also accept
  `--rspack-version` for opting into v1).
- Website: "Using Rspack 2 with Re.Pack" migration page — Node floor, removed experiment
  keys, `experiments.cache` → `cache`, `stats.json` content changes, chunk-global rename
  note for anyone post-processing bundles, MFv1 runtime-tools install requirement.
- Changeset: minor release of `@callstack/repack` (new capability, no breaking change for
  v1 users). Plugins need no code change (types only) but should get a compatible release
  if the type bump alters their builds.

## Out of scope (this effort)

- Making `@callstack/repack` itself ESM-only or dropping Node 18 — separate discussion for
  the next major.
- Adopting v2-only features (RSC, `optimization.inlineExports`, `moduleIds: 'hashed'`,
  rule-level `parallel` by default) — follow-ups listed in [05](./05-user-benefits.md).
