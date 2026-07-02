# Open Questions, Concerns & Potential Blockers

Ordered roughly by how much they gate implementation. "Verify" items are cheap experiments
to run at the start of implementation; "Decide" items need a team call.

> **Status 2026-07-02: Q1–Q5 are decided** (decisions recorded inline below), and the
> React Refresh approach is decided too — drop the v1 plugin dep; official v2 plugin for
> Rspack ≥ 2, vendored client files for Rspack 1 + webpack. Details in
> [06-react-refresh-deep-dive.md](./06-react-refresh-deep-dive.md).

## Decide (product/policy calls)

### Q1. `exportsPresence` default: do we shield RN users? <a name="exportspresence"></a>

Rspack 2 turns "importing a non-existent export" from a warning into a **hard build error**
([PR #13002](https://github.com/web-infra-dev/rspack/pull/13002)). The RN ecosystem relies
heavily on loose imports (platform-forked files, optional native modules, flow-typed
packages); Metro doesn't even do export validation. A user upgrading to Rspack 2 may see
their app fail on errors *inside node_modules they can't fix*.

Options:

- a) Set `module.parser.javascript.exportsPresence: 'auto'` (or `'warn'`) in
  `getRepackConfig` for Rspack 2 → Metro-like tolerance, users can opt into strictness.
- b) Leave upstream default (`'error'`) → stricter correctness, more upgrade friction.

**Recommendation: (a)**, matching Re.Pack's Metro-compatibility posture. Cheap to do,
documented as overridable.

> ✅ **DECIDED (2026-07-02): option (a)** — set `exportsPresence: 'auto'` in
> `getRepackConfig` under Rspack 2.

### Q2. Node support policy

- Keep `engines.node: ">=18"` and enforce the Rspack-2 floor (≥20.19 / ≥22.12) at runtime
  with a clear error (plan §1.4)? — **Recommended**; Rspack 1 + webpack users on Node 18
  keep working.
- Or bump engines to `>=20.19` for the next repack minor? Simpler story, but drops Node 18
  webpack/Rspack-1 users in a *minor* release — likely needs a major instead.
- Note: React Native 0.84 tooling generally assumes Node ≥20 already, so the practical
  impact of keeping `>=18` is small either way.

> ✅ **DECIDED (2026-07-02): keep `engines.node: ">=18"`** and enforce the Rspack-2 floor
> at runtime with a clear error (plan §1.4).

### Q3. What do new projects get (`repack-init`, docs, templates)?

`packages/init/src/versions.json` pins `@rspack/core: ^1.7.8`. Once dual support ships, do
new projects default to v2? Suggest yes (upstream recommends v2; v1 is critical-fixes-only)
— but only after the full tester-app validation pass. Interim option: ship dual support
first, flip the init default in a follow-up.

> ✅ **DECIDED (2026-07-02): default new projects to Rspack v2** (`repack-init`,
> templates, docs) once the validation pass is green.

### Q4. Minimizer default under v2

Terser (current, battle-tested for RN/Hermes output) vs `SwcJsMinimizerRspackPlugin`
(~50% faster cached, but we abandoned it before due to breakage — see
`shouldUseTerserForRspack` and its 1.4.11/1.5.0 history). Needs an output-parity
check on Hermes before switching. Safe default: keep Terser, offer SWC opt-in.

> ✅ **DECIDED (2026-07-02): keep Terser as the default**, offer
> `SwcJsMinimizerRspackPlugin` as an opt-in; revisit after a Hermes output-parity check.

### Q5. Do we still test/support Rspack 1 in CI indefinitely?

Dual support doubles the integration matrix. Proposal: full matrix until repack's next
major, then v1 moves to a legacy lane (smoke tests only). Needs maintainer sign-off
because it affects CI minutes and release checklists.

> ✅ **DECIDED (2026-07-02): keep supporting/testing Rspack 1 at least until Re.Pack's
> next major release.**

## Verify (cheap experiments, do first during implementation)

| # | Check | Why it matters | Expected |
| --- | --- | --- | --- |
| V1 | `require('@rspack/core')` from repack's compiled CJS on Node 20.19+/22.12+ — named exports (`rspack`, `rspackVersion`) AND Babel default-interop | The entire rspack command tree loads this way | Works (`require(esm)` + Node's `__esModule` interop marker), but must be smoke-tested before anything else |
| V2 | `rspackVersion` still exported from `@rspack/core@2` | Our version-detection helper depends on it | Yes (webpack-compat export) |
| V3 | `rspack.experiments.swc` still exposed in v2 JS API | `babelSwcLoader` uses it to get a SWC instance (`utils.ts:134-142`) | Unclear — **potential blocker for babel-swc-loader under v2** if moved/removed; fallback to `@swc/core` exists but changes behavior |
| V4 | `compiler.webpack.container.ModuleFederationPluginV1` exists in v2 | `ModuleFederationPluginV1` resolves it | Expected yes (MF 1.5 plugin kept; only runtime-tools became optional peer) |
| V5 | `devServer` key in config: does v2 schema validation reject it? | `bundle.ts:38` already deletes it "to avoid schema validation errors"; the `start` flow passes configs to `rspack()` with `devServer` present | If rejected, strip it in `makeCompilerConfig` for v2 |
| V6 | `chunkLoading: 'jsonp'` + `chunkFormat: 'array-push'` + `globalObject` produce working RN bundles under v2 (ScriptManager local chunks, MF remotes) | Core of Re.Pack's RN runtime | Expected yes; integration-test it |
| V7 | HMR end-to-end under v2 (`__webpack_hash__`, hot-update chunk fetch/eval, React Refresh with **v1 plugin client files**) | HMR client + DevelopmentPlugin wiring | Expected yes; the client files use the stable `module.hot` API |
| V8 | Top-level `target` propagation doesn't override our per-rule SWC options ([PR #12752](https://github.com/web-infra-dev/rspack/pull/12752)) | We pass explicit `jsc`/`env` per rule for RN/Hermes syntax floors | Explicit options should win; confirm |
| V9 | `--trace-*` profiling flow against v2 tracing | `profile-1.4.ts` gates on `major > 1` so v2 takes this path today — was that contract kept? | Unknown; may need `profile-2.ts` |
| V10 | `@module-federation/enhanced` version(s) certified for Rspack 2 (and whether `enhanced/rspack` subpath imports v2 core cleanly from CJS) | `ModuleFederationPluginV2` + both tester-federation apps | Needs upstream matrix check (enhanced ≥2.x expected) |
| V11 | `tests/metro-compat` under v2 — especially aliased dynamic require (`requireAlias` now `false` by default, [PR #12697](https://github.com/web-infra-dev/rspack/pull/12697)) | RN packages (moment-style locale loading, lazy platform requires) may silently stop bundling context modules | Unknown — **most likely source of subtle user regressions** |

## Concerns (not blockers, keep on the radar)

- **Chunk global rename** (`webpackChunk*` → `rspackChunk*`, same for hot updates): safe
  within a build, but anyone doing OTA/code-push-style delivery where a *pre-built* chunk
  is loaded into a host built with a different Rspack major will break. Also affects users
  who hand-patch or post-process bundles matching on `webpackChunk`. Mitigation: docs note
  + users can pin `output.chunkLoadingGlobal` themselves for cross-version stability.
- **Type duality:** compiling repack against v2 types while supporting v1 at runtime means
  v1-only user configs (e.g. `experiments.cache`) type-error against our exported config
  types even though they run fine. Acceptable if documented; revisit if users complain.
- **`stats.json` content shrink** under v2 defaults for `bundle --json` consumers
  (custom analysis scripts, size-tracking CI) — docs note.
- **plugin-react-refresh v1 pin longevity:** staying on the v1 plugin line is fine today,
  but upstream will eventually stop patching it; the manual-path-resolution approach in
  the plan removes the coupling so a future bump to ^2 is trivial.
- **Upstream cadence:** 2.x is moving fast (2.0 → 2.1.2 in ~2 months). Pin exact versions
  in CI fixtures to keep failures attributable.
- **Rsbuild/rstack interplay:** none of our packages depend on Rsbuild, but users mixing
  Re.Pack docs with Rsbuild guides will hit config-shape differences; keep our migration
  page self-contained.

## Current blocker summary

No hard blockers found for dual support. The two items that could *become* blockers if
they verify badly:

1. **V3** — if `experiments.swc` disappeared from v2's JS API, `babel-swc-loader` needs a
   new SWC acquisition path for v2 (fallback to project-installed `@swc/core` exists but
   changes the default experience).
2. **V10** — if current `@module-federation/enhanced` releases don't support Rspack 2
   cleanly, MFv2 users can't move until upstream ships support (out of our control).
