# Verification Results (V1–V11)

Executed 2026-07-02 against `@rspack/core@2.1.2`, `@rspack/plugin-react-refresh@2.0.2`,
`@module-federation/enhanced@2.6.0` on Node v26.3.1, in an isolated lab project
(CJS consumer, mirroring `@callstack/repack`'s published module format). Checklist
defined in [04-questions-and-blockers.md](./04-questions-and-blockers.md).

External sources:

- [Planned breaking changes discussion (web-infra-dev/rspack#9270)](https://github.com/web-infra-dev/rspack/discussions/9270)
- [Official 1.x → 2.0 migration guide](https://rspack.rs/guide/migration/rspack_1.x)
- Packages tested (from npm): [@rspack/core@2.1.2](https://www.npmjs.com/package/@rspack/core/v/2.1.2),
  [@rspack/core@1.7.12](https://www.npmjs.com/package/@rspack/core/v/1.7.12),
  [@rspack/plugin-react-refresh@2.0.2](https://www.npmjs.com/package/@rspack/plugin-react-refresh/v/2.0.2),
  [@module-federation/enhanced@2.6.0](https://www.npmjs.com/package/@module-federation/enhanced/v/2.6.0)

## Scoreboard

| # | Check | Verdict |
| --- | --- | --- |
| V1 | `require(esm)` of `@rspack/core` from CJS | ✅ PASS |
| V2 | `rspackVersion` export | ✅ PASS |
| V3 | `experiments.swc` JS API | ✅ PASS — potential blocker cleared |
| V4 | Built-in `ModuleFederationPluginV1` | ✅ PASS (functional build) |
| V5 | `devServer` key vs v2 validation | ✅ PASS (accepted) |
| V6 | RN chunk loading chain under v2 | ✅ PASS (executed end-to-end) |
| V7 | HMR machinery (build-level) | ✅ PASS — device e2e still required |
| V8 | `target` propagation vs explicit loader options | ✅ PASS (explicit wins) |
| V9 | `--trace-*` / globalTrace | ⚠️ **PARTIAL — perfetto layer missing from published binaries** |
| V10 | `@module-federation/enhanced` on Rspack 2 | ✅ PASS — potential blocker cleared |
| V11 | Aliased dynamic require + `exportsPresence` | ✅ PASS (with one prediction overturned) |

**No blockers.** Both items previously flagged as potential blockers (V3, V10) cleared.
One new work item surfaced (V9 perfetto). Two findings **revise the impact analysis** —
see "Revised findings" below.

## Details

### V1 — `require('@rspack/core')` from CJS ✅

Better than expected. Rspack 2 uses Node's `module.exports` ESM-interop convention, so
`require('@rspack/core')` returns **the callable `rspack` function itself** with all named
exports attached (`core.rspack === core` is `true`) — byte-for-byte compatible with v1's
CJS shape. Babel-compiled named imports (`_core.rspack`) and default-import interop both
work. Note: no `__esModule` marker and no `default` export — irrelevant for our usage, but
`import default` of **`@rspack/plugin-react-refresh@2`** yields `undefined` (named export
only), independently confirming that part of break №2.

### V2 — `rspackVersion` ✅

Exported, returns `2.1.2`. The version-detection helper (plan §0.1) is safe.

### V3 — `experiments.swc` ✅ (blocker cleared)

Present with `transform`, `transformSync`, `minify`, `minifySync` — exactly what
`babelSwcLoader/utils.ts` consumes. No new SWC acquisition path needed.

### V4 — Built-in MFv1 plugin ✅ (functional)

`rspack.container.ModuleFederationPluginV1` exists (alongside `ModuleFederationPlugin`,
`ContainerPlugin`, `ContainerReferencePlugin`; `sharing.*` includes a new
`TreeShakingSharedPlugin`). A functional host build with
`library: { type: 'self' }` + `exposes` compiled with **zero errors** and rendered the
container exactly as Re.Pack expects: `self.mfv1host = __webpack_exports__`.
`@module-federation/runtime-tools` was resolvable in the lab only because
`@module-federation/enhanced` hoists it — a standalone MFv1 user won't have it, so the
**pre-check + friendly error stays in the plan** (§2.3).

### V5 — `devServer` key ✅ (and a broader discovery)

`rspack({ ...config, devServer: {...} })` is accepted — no stripping needed in the `start`
flow. Broader discovery: **v2 config validation is loose** — unknown keys (bogus
experiments, bogus top-level keys) are silently ignored, not rejected. Validation does
exist but only enforces specific invariants (e.g. `context` must be absolute). This
overturns the "validation on by default → hard failure" assumption from the initial
research; see "Revised findings".

### V6 — RN chunk-loading chain ✅ (executed end-to-end)

Reproduced `RepackTargetPlugin`'s exact mechanism under v2 and **executed the output**:

- Runtime module names intact: `load_script` still fires (alongside `ensure_chunk`,
  `jsonp_chunk_loading`, `public_path`, `get javascript chunk filename`,
  `has_own_property`) — the `module.name === 'load_script' || 'load script'` match in
  `RepackTargetPlugin.ts:115` keeps working. (CSS runtime module names untested — no CSS
  in the fixture; low risk.)
- `module.source.source = Buffer.from(...)` mutation applies (marker found in output).
- `compilation.addRuntimeModule(chunk, new CustomRuntimeModule())` with a
  `compiler.webpack.RuntimeModule` subclass works (`STAGE_BASIC`, `generate()`).
- `chunkLoading: 'jsonp'` + `chunkFormat: 'array-push'` + `globalObject: 'self'` +
  `target: false` build executed in a VM with a `self` shim: the async `import()` resolved
  through our replaced loader — the full ScriptManager-style interception chain works.
- Confirmed live: `chunkLoadingGlobal` is now `rspackChunk${uniqueName}` — internally
  consistent, bundle runs fine; cross-major chunk mixing caveat stands (docs note).

### V7 — HMR machinery ✅ (build-level; device e2e outstanding)

Dev build with `HotModuleReplacementPlugin`: `__webpack_hash__` compiles to the runtime
hash function, `module.hot` API present, hot-update chunk filename machinery present, and
the hot-update global is `rspackHotUpdatetesterapp` (rename confirmed live; our client
never hardcodes it). Real HMR + React Refresh on an iOS/Android device remains a
Phase 3 validation item.

### V8 — `target` propagation ✅

With top-level `target: ['web', 'es2022']`:

- explicit `builtin:swc-loader` options `{ jsc: { target: 'es5' } }` **win** — optional
  chaining and private class fields were downleveled;
- with no loader options, the propagated es2022 target applies (modern syntax preserved).

Re.Pack's per-rule SWC options are safe; no config changes needed.

### V9 — Tracing ⚠️ PARTIAL (new work item)

`rspack.experiments.globalTrace.{register,cleanup}` exist (API compatible), **but the
published 2.1.2 binaries are built without the perfetto trace layer**:
`register(filter, 'perfetto', out)` throws
*"Perfetto trace layer is not enabled in this build"*. The `'logger'` layer works.
Re.Pack's `profile-1.4.ts` defaults `traceLayer` to `'perfetto'` and its `major > 1` gate
sends Rspack 2 down that path → **`--trace-*` with default options breaks under v2**.
Plan impact (§2.5): add `profile-2` handling — default to `'logger'` under v2 (or
detect/surface the build-feature error clearly), and check whether upstream restores
perfetto in later binaries.

### V10 — Module Federation v2 ✅ (blocker cleared)

`require('@module-federation/enhanced/rspack')` from CJS works (v2.6.0 ships CJS).
An MF host with `exposes` built cleanly on Rspack 2 — container + expose chunks emitted,
zero errors. Minor: the bundled Manifest plugin warns when `publicPath` isn't a string —
Re.Pack uses `publicPath: 'noop:///'` (a string), but worth watching in tester-federation
runs. `enhanced`'s exports map does not expose `./package.json`; Re.Pack's pre-check
resolves the main entry, so unaffected.

### V11 — Parser behavior ✅ (one prediction overturned)

- **`exportsPresence`**: v2 default confirmed as hard error
  (`ESModulesLinkingError: export 'x' was not found`). Setting
  `module.parser.javascript.exportsPresence: 'auto'` downgrades it to a warning — the
  **Q1 fix works exactly as decided**.
- **Aliased dynamic require**: the predicted regression **did not reproduce** on 2.1.2 —
  `const r = require; r('./locales/' + name + '.js')` still creates a context module and
  bundles the locale files with default settings (and `requireAlias: true` also works as
  an explicit opt-in). Possibly relaxed after the 2.0 release (the related
  `requireAsExpression` flip was also reverted upstream). The full `tests/metro-compat`
  sweep in Phase 3 remains the definitive check.

## Revised findings vs the original impact analysis

1. **Break №1 (`experiments.parallelLoader`) downgraded**: v2 **silently ignores** the
   key — no validation error, builds succeed. Still worth removing under v2 (dead config;
   rejected by v2 *TypeScript types* at compile time; our loader's parallel-mode warning
   probe goes permanently quiet), but users won't hard-fail. Original claim of
   "schema validation error on every build" was wrong.
2. **Break №3 (`experiments.cache`) is a *silent* behavior loss, not an error**: verified
   functionally — `experiments.cache: { type: 'persistent' }` is inert under v2 (no cache
   dir created), while top-level `cache` works. A user migrating to v2 with a v1-style
   config **loses persistent caching without any signal**. Plan §1.2 gains a sub-item:
   when running v2 and `experiments.cache` is set, emit a warning pointing to top-level
   `cache` (consider honoring it by copying it over). *(The "copy it over" idea was
   later rejected by maintainer feedback #5 — warn-only, no mutation; doc 10 §5.)*
3. **Break №2 (React Refresh) stands** as the only import-time hard crash, and the
   named-export-only detail was independently confirmed.
4. **New: v2 config validation is loose** — unknown keys silently pass. Good for
   forward-compat of generated configs; bad for typo detection (documentation note).
5. **New: perfetto tracing absent from published v2 binaries** (V9) — `--trace-*` needs a
   v2 code path defaulting to the `logger` layer.

## Lab artifacts

Experiment scripts live in the session scratchpad (`v2-lab/`): `api-checks.cjs`,
`validation-probe.cjs`, `cache-check.cjs`, `v6-runtime.cjs`, `v7-hmr.cjs`,
`v8-target.cjs`, `v11.cjs`, `v10-mf.cjs`, `v4-v9-functional.cjs`. They are
self-contained and can be re-run against future Rspack releases by bumping the installed
version.
