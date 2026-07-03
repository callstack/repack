# Rspack 2.0 Breaking Changes — Full Inventory & Re.Pack Impact

Compiled from:

- [Planned breaking changes discussion (web-infra-dev/rspack#9270)](https://github.com/web-infra-dev/rspack/discussions/9270)
- [Official 1.x → 2.0 migration guide](https://rspack.rs/guide/migration/rspack_1.x)
- [Announcing Rspack 2.0](https://rspack.rs/blog/announcing-2-0)
- Published npm metadata for `@rspack/core@2.1.2`, `@rspack/cli@2.1.2`,
  `@rspack/dev-server@2.1.0`, `@rspack/plugin-react-refresh@2.0.2`

Impact levels are for **Re.Pack itself** (our packages), with a separate note when the
change affects **Re.Pack users' projects** instead.

## Platform & packaging

| # | Change | Upstream ref | Impact on Re.Pack |
| --- | --- | --- | --- |
| 1 | **Node.js 18 dropped** — requires `^20.19.0 \|\| >=22.12.0` | [PR #12739](https://github.com/web-infra-dev/rspack/pull/12739) | **HIGH.** Our packages declare `engines.node: ">=18"`; CI matrix tests Node 18. Rspack-2 users need ≥20.19. See [03](./03-dual-version-support-plan.md#node--engines). |
| 2 | **Pure ESM packages** — `@rspack/core`, `@rspack/cli`, `@rspack/dev-server` publish ESM only; CJS build removed. Works via `require(esm)` on Node ≥20.19 | [PR #12733](https://github.com/web-infra-dev/rspack/pull/12733) | **MEDIUM.** `@callstack/repack` is CJS; its compiled `require("@rspack/core")` still works on Node ≥20.19 via `require(esm)`. Needs interop verification (named + default imports). See [02 §1](./02-impact-analysis.md). |
| 3 | **`@rspack/dev-server` no longer bundled with `@rspack/cli`**; rewritten on `@rspack/dev-middleware` + `connect-next` (192 deps → 1) | [PR #12750](https://github.com/web-infra-dev/rspack/pull/12750) | **NONE.** Re.Pack ships its own Fastify-based dev server (`@callstack/repack-dev-server`); we don't use `@rspack/dev-server` or webpack-dev-middleware. |
| 4 | **`@module-federation/runtime-tools` moved to optional peerDependency** of `@rspack/core` (`^0.24.1 \|\| ^2.0.0`) | [PR #12663](https://github.com/web-infra-dev/rspack/pull/12663) | **MEDIUM (users).** Users of our `ModuleFederationPluginV1` (backed by Rspack's built-in MF plugin) must now install runtime-tools themselves. We should detect and give a friendly error. |
| 5 | **Built-in webpack-bundle-analyzer / `--analyze` removed** from CLI; use Rsdoctor | [PR #12699](https://github.com/web-infra-dev/rspack/pull/12699) | **NONE.** We don't use `@rspack/cli`. |

## Configuration schema (validation is on by default in 2.0)

> Note (verified against 2.1.2, [doc 07](./07-verification-results.md)):
> despite "validation on by default", unknown top-level and `experiments`
> keys are **silently accepted** — removed keys are TS-type and semantic
> issues (dead config), not reliable runtime validation failures.

| # | Change | Upstream ref | Impact on Re.Pack |
| --- | --- | --- | --- |
| 6 | **`experiments.parallelLoader` removed** (stable; opt-in stays via `module.rules[].use[].parallel` — re-verified against the migration guide 2026-07-02, [doc 10 §6](./10-maintainer-feedback-evaluation.md)) | [PR #12658](https://github.com/web-infra-dev/rspack/pull/12658) | **MEDIUM — confirmed break (severity revised, [doc 07](./07-verification-results.md)).** `getRepackConfig` sets `experiments: { parallelLoader: true }` for rspack → **silently ignored** under v2 (validation is loose, not a schema error): dead config, rejected by v2 TS types, and the loader's parallel-mode warning probe goes permanently quiet. Still gated by major. |
| 7 | **`experiments.cache` → top-level `cache`** (persistent cache stable) | [PR #12705](https://github.com/web-infra-dev/rspack/pull/12705) | **HIGH — confirmed break.** `--reset-cache` reads `config.experiments?.cache`; `resetPersistentCache` types derive from `experiments.cache` (gone from v2 types). |
| 8 | `experiments.incremental` → top-level `incremental` | [PR #12793](https://github.com/web-infra-dev/rspack/pull/12793) | **NONE.** Not set by us. |
| 9 | `experiments.lazyCompilation` → top-level `lazyCompilation` | [PRs #12721, #12736](https://github.com/web-infra-dev/rspack/pull/12721) | **NONE.** Not set by us. Doc-only impact for users. |
| 10 | Removed stabilized experiments: `topLevelAwait`, `lazyBarrel`, `inlineConst`, `inlineEnum`, `typeReexportsPresence`, `layers`, `css`, `outputModule` (→ `output.module`), `rspackFuture` | [PRs #12722–#12744, #12654](https://github.com/web-infra-dev/rspack/pull/12722) | **NONE for us**; **LOW (users)** — user configs setting these keys get **dead config** under v2 (silently ignored — validation is loose, see note above; the keys are also rejected by v2 TS types for typed configs). Worth a migration-guide note on our docs site. |
| 11 | **`stats.toJson()` defaults** — `modules`, `assets`, `chunks`, `chunkGroups`, `entryPoints` now default to `false` | [PR #12701](https://github.com/web-infra-dev/rspack/pull/12701) | **LOW.** All our `toJson()` calls pass explicit options (`OutputPlugin`, `LoggerPlugin`, `Compiler`). User-facing: `bundle --json` output content depends on user `stats` config and may shrink. |
| 12 | **`profile` and `stats.profile` removed** (use tracing/Rsdoctor) | [PR #12662](https://github.com/web-infra-dev/rspack/pull/12662) | **LOW.** Our `--trace-*` profiling uses env-var tracing, already version-branched (`profile-1.4.ts` vs `profile-legacy.ts`); needs a compat check for the v2 tracing API. |
| 13 | `module.unsafeCache` removed | migration guide | **NONE.** Not used. (Refactor was deferred, removal landed in the guide.) |
| 14 | `optimization.removeAvailableModules` removed | migration guide | **NONE.** Not used. |

## Output & runtime

| # | Change | Upstream ref | Impact on Re.Pack |
| --- | --- | --- | --- |
| 15 | **`output.chunkLoadingGlobal` default: `webpackChunk${uniqueName}` → `rspackChunk${uniqueName}`** | [PR #12779](https://github.com/web-infra-dev/rspack/pull/12779) | **LOW.** We set `chunkLoading: 'jsonp'` + `chunkFormat: 'array-push'` + `globalObject: 'self'` but not the global name — however the name is only referenced by Rspack-generated code (runtime + chunks from the same build), so it's internally consistent. Risk only if users hand-patch bundles or mix chunks across bundler majors (OTA/code-push style). Documented in [04](./04-questions-and-blockers.md). |
| 16 | **`output.hotUpdateGlobal` default: `webpackHotUpdate*` → `rspackHotUpdate*`** | [PR #12774](https://github.com/web-infra-dev/rspack/pull/12774) | **LOW.** Our HMR path (`WebpackHMRClient` + `loadScript` runtime) fetches hot-update chunks and evaluates them; it never hardcodes the global name. Internally consistent per build. |
| 17 | Removed deprecated `output.libraryTarget` / `libraryExport` / `umdNamedDefine` / `auxiliaryComment` (→ `output.library.*`) | [PR #12745](https://github.com/web-infra-dev/rspack/pull/12745) | **NONE.** We use the `library: { name, type }` object form already (`ModuleFederationPluginV1` uses `type: 'self'`). |
| 18 | `output.charset` removed | [PR #12660](https://github.com/web-infra-dev/rspack/pull/12660) | **NONE.** Not used. |
| 19 | `output.trustedTypes.policyName` fallback `'webpack'` → `'rspack'` | [PR #12799](https://github.com/web-infra-dev/rspack/pull/12799) | **NONE.** Not relevant to RN. |
| 20 | `bundlerInfo.force` default `true` → `false` (moved to `output.bundlerInfo`) | migration guide | **NONE.** Not used. |
| 21 | **`devtool` defaults changed** — dev: `eval` → `cheap-module-source-map`; prod (CLI): `source-map` → `false` | [PR #12934](https://github.com/web-infra-dev/rspack/pull/12934) | **NONE.** `getRepackConfig` always sets `devtool: 'source-map'` explicitly and `SourceMapPlugin` manages the rest. |

## Module parsing & resolution

| # | Change | Upstream ref | Impact on Re.Pack |
| --- | --- | --- | --- |
| 22 | **`exportsPresence` default `'warn'` → `'error'`**; `strictExportPresence` removed | [PR #13002](https://github.com/web-infra-dev/rspack/pull/13002) | **HIGH (users).** Builds that only warned on bad imports now fail. The RN ecosystem is notorious for this (platform-specific/optional exports). Strong candidate for a Re.Pack lenient default. See [04](./04-questions-and-blockers.md). |
| 23 | **Aliased dynamic `require` skipped by default** (`requireAlias` default `true` → `false`), e.g. `var r = require; r('./x' + name)` no longer creates a context module | [PR #12697](https://github.com/web-infra-dev/rspack/pull/12697) | **MEDIUM (users).** Some RN/CommonJS packages rely on this. Needs a `tests/metro-compat` sweep. (Note: the related `requireAsExpression` disable was **reverted** in [PR #12998](https://github.com/web-infra-dev/rspack/pull/12998), so "critical dependency" warnings still appear — our `plugin-reanimated` warning filter stays relevant.) |
| 24 | **`builtin:swc-loader` no longer reads `.swcrc`** (unconditionally) | [PRs #12661, #12667, #12668](https://github.com/web-infra-dev/rspack/pull/12661) | **NONE for us** (no `.swcrc` anywhere; all SWC options passed inline via `getJsTransformRules`). **LOW (users)** with their own `.swcrc`. |
| 25 | **Top-level `target` now propagates** to `builtin:swc-loader`, `builtin:lightningcss-loader`, and minimizers | [PRs #12752, #12780](https://github.com/web-infra-dev/rspack/pull/12752) | **MEDIUM — needs verification.** We set our own SWC `env`/`jsc` options per rule; need to confirm explicit loader options still win over the propagated target, and check what our `RepackTargetPlugin` target (`false` + custom) propagates. |
| 26 | `resolve.roots` default `[context]` → `[]` | [PR #13273](https://github.com/web-infra-dev/rspack/pull/13273) | **NONE.** `getResolveOptions` doesn't use `roots`; RN projects don't use `/`-absolute imports idiomatically. |
| 27 | `.wasm` removed from default `resolve.byDependency` extensions; `experiments.asyncWebAssembly` enabled by default | [PR #13321](https://github.com/web-infra-dev/rspack/pull/13321), [PR #12764](https://github.com/web-infra-dev/rspack/pull/12764) | **NONE.** We fully override `extensions` and `byDependency` in `getResolveOptions`. |
| 28 | CSS `@import` conditions no longer include `webpack` by default | migration guide | **NONE.** Not relevant to our resolution setup. |
| 29 | `rspackExperiments.import` → top-level `transformImport`; `rspackExperiments.collectTypeScriptInfo` → top-level | migration guide | **NONE.** Not used. |

## Plugin & JS API

| # | Change | Upstream ref | Impact on Re.Pack |
| --- | --- | --- | --- |
| 30 | **`ProgressPlugin` handler 3rd arg**: `...args: string[]` → `info: { builtModules, moduleIdentifier? }` | [PR #13049](https://github.com/web-infra-dev/rspack/pull/13049) | **NONE.** Both our handlers (`commands/rspack/Compiler.ts`, `commands/webpack/CompilerWorker.ts`) only use `percentage`. |
| 31 | **`RuntimeModule.constructorName` / `.moduleIdentifier` removed** (use `constructor.name` / `identifier()`) | [PRs #12673, #12684](https://github.com/web-infra-dev/rspack/pull/12673) | **NONE.** Our 4 custom runtime modules use standard `name`/`generate()`; `RepackTargetPlugin` checks `module.name`, which stays. (The `moduleIdentifier` read in `plugin-reanimated` is on **warning objects** from `ignoreWarnings`, unrelated.) |
| 32 | `plugin.getHooks` removed (→ `getCompilationHooks`) on Html/Runtime/Rsdoctor plugins | [PR #12738](https://github.com/web-infra-dev/rspack/pull/12738) | **NONE.** We tap `compilation.hooks.runtimeModule` directly. |
| 33 | `WarnCaseSensitiveModulesPlugin` → `CaseSensitivePlugin`; `EsmLibraryPlugin` removed (→ `output.library.type: 'modern-module'`); `HtmlRspackPlugin.sri` removed; LightningCSS minimizer `draft`/`cssHeadDataCompression` removed; `SubresourceIntegrityPlugin` moved out of `experiments` | various PRs in discussion | **NONE.** None of these plugins are used by Re.Pack. |
| 34 | `readResourceForScheme` hook removed | [PR #13027](https://github.com/web-infra-dev/rspack/pull/13027) | **NONE.** Not used. |
| 35 | **`@rspack/plugin-react-refresh@2`**: pure ESM, `deprecated_runtimePaths` static **removed**, peer `@rspack/core@^2`, overlay client files removed | verified against published 2.0.2 tarball | **HIGH — confirmed break** if we upgrade the dependency. `DevelopmentPlugin.ts:12` destructures `deprecated_runtimePaths` at module load. The v1 plugin line (≤1.6.2) has **no `@rspack/core` peer dep**, so pinning v1 works under Rspack 2. See [03](./03-dual-version-support-plan.md#react-refresh). |

## Not landing in 2.0 (tracked, no action)

- `module.unsafeCache` redesign — deferred ("will not be included in v2.0").
- `loaderContext._module` deprecation — **deferred** explicitly because plugins need it for
  loader→plugin metadata until a persistent-cache-safe JS API exists. (We don't use it anyway.)
- `requireAsExpression` default flip — landed then **reverted** ([PR #12998](https://github.com/web-infra-dev/rspack/pull/12998)).
