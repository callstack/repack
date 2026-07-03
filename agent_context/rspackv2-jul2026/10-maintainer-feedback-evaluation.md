# Maintainer Feedback Evaluation & Implementation Revision

Point-by-point evaluation of the maintainer feedback on
[#1393](https://github.com/callstack/repack/pull/1393) (recorded verbatim-ish
in [doc 09](./09-pr-split-plan.md)): what each point means, how valid it is
against the code and upstream sources, and exactly how the plan/implementation
changes in response. Written 2026-07-02.

Legend for the validity verdict: **✅ valid** (adopt as-is), **✅ valid with
nuance** (adopt, with a caveat recorded), **⚠️ partially correct** (the
underlying concern is right but a factual detail isn't).

---

## #1 — Vendoring the React Refresh client files is fine

**Feedback.** `deprecated_runtimePaths` was originally used just for ease of
use — no attachment to it.

**Understanding.** The maintainer confirms the doc 06 finding: Re.Pack's use
of `ReactRefreshPlugin.deprecated_runtimePaths` was a convenience (getting
paths to the plugin's client runtime files without wiring them manually), not
a load-bearing design choice. Replacing it with vendored copies of those
files is acceptable.

**Validity: ✅ valid.** Matches the upstream history — the accessor existed
for integrators and was removed in `@rspack/plugin-react-refresh@2`
(doc 06). No revision needed; this de-risks the riskiest decision.

**Plan impact.** None (confirmation). The considered-and-rejected alternative
is recorded under #3 for completeness.

---

## #2 — Keep vendored code out of main `src/`

**Feedback.** Put the vendored files in a dedicated `vendor` directory, not
`src/modules/reactRefresh/`.

**Understanding.** Third-party-derived code mixed into first-party `src/`
creates review noise (it gets linted/formatted/refactored like our code),
obscures licensing provenance, and invites accidental "improvements" that
diverge from upstream.

**Validity: ✅ valid.** Standard convention, and cheap to satisfy. The three
files (`reactRefresh.js`, `reactRefreshEntry.js`, `refreshUtils.js`, adapted
from `@rspack/plugin-react-refresh@2.0.2`, MIT) are plain JS client-runtime
modules — they are bundled by the *user's* compiler at app build time, never
executed inside Re.Pack's Node process, so they don't need Re.Pack's babel
build at all. (Today they pass through `babel src → dist`, which preserves
ESM anyway — doc 08; shipping them as-is is equivalent and simpler.)

**Implementation (PR 6; applied to the reference branch 2026-07-02 — see
doc 08 § Reference branch updates).** Package-root `vendor/` shipped
verbatim:

```text
packages/repack/
  vendor/
    react-refresh/
      LICENSE           # upstream MIT license + provenance note (v2.0.2)
      reactRefresh.js
      reactRefreshEntry.js
      refreshUtils.js
```

```jsonc
// packages/repack/package.json
{
  "files": ["dist", "vendor", /* ...existing entries */ ]
}
```

```ts
// DevelopmentPlugin.setupManualReactRefresh - resolution moves from
// '../modules/reactRefresh/*' (dist-relative) to the vendor dir
// (dist/plugins/DevelopmentPlugin.js -> ../../vendor/react-refresh/*)
const reactRefreshPath = require.resolve(
  '../../vendor/react-refresh/reactRefresh.js'
);
```

Plus: exclude `vendor/` from biome and from the babel `src → dist` build
inputs (it no longer lives under `src/`), and keep an upstream-diff note in
the LICENSE/provenance file so future bumps can re-derive the adaptation
(the only functional edit: the removed overlay flags are replaced by
`__reload_on_runtime_errors__: false`).

Fallback if shipping raw files proves awkward: `src/vendor/` (build-processed)
was explicitly offered by the maintainer as acceptable. **Resolved when
applying (2026-07-02): raw shipping worked** — the files turned out to be
verbatim upstream v2.0.2 apart from headers/formatting (diffed to confirm,
recorded in the LICENSE provenance note); the fallback wasn't needed.

---

## #3 — Minimize the DevelopmentPlugin footprint; test both bundler paths

**Feedback.** `DevelopmentPlugin` serves BOTH rspack and webpack; expectation
is that little actually *needed* to change beyond deprecated-usage cleanup.
Test both paths; a per-bundler plugin split is on the table if refresh
diverged too much.

**Understanding.** Two asks: (a) confidence that webpack/Rspack-1 users see
no behavior change, (b) a diff that reads as "cleanup + one new branch", not
a rewrite.

**Validity: ✅ valid with nuance.** The concern is right, but "little needed
to change" undersells one thing: the plugin-v1 dependency *had* to go (its
module-load-time `deprecated_runtimePaths` access hard-crashes under the v2
plugin, and keeping `@rspack/plugin-react-refresh@1` as a dependency while
needing `^2` as a peer is unresolvable — same package name). So the manual
path's *runtime files* necessarily change source. The current diff (+157
lines) is structurally mostly **moved** code — the old inline manual wiring
became `setupManualReactRefresh()` — plus the new v2 branch. The actual
decision point is ~10 lines:

```ts
// the only behavioral fork - everything else is extraction
const rspackMajor = getRspackMajorVersionFromCompiler(compiler);
const reactRefreshEntryPath =
  rspackMajor !== null && rspackMajor >= 2
    ? this.setupOfficialReactRefresh(compiler)   // official v2 plugin
    : this.setupManualReactRefresh(compiler);    // webpack + Rspack 1
```

A per-bundler plugin split is **not** warranted for one 10-line fork —
agreed with the maintainer's default.

**The honest webpack-visible delta** (what PR 6's description must enumerate,
and what the explicit webpack-path test must cover):

1. **Runtime files**: plugin v1's client files → vendored v2.0.2-adapted
   files. Same wiring shape (`ProvidePlugin` ×2 + `DefinePlugin` + loader
   rule + entry).
2. **Define flags**: `__react_refresh_error_overlay__: false` +
   `__react_refresh_socket__: false` → `__reload_on_runtime_errors__: false`
   — the v2 client files dropped the overlay/socket knobs and read the new
   flag instead. Value semantics are unchanged (all web-oriented behaviors
   stay off; RN surfaces errors via LogBox).
3. **Loader rule matcher**: `include:` → `test:` with the same regex —
   both match the resource path here, but it's a semantic key change worth
   covering in the test.

**Rejected alternative (recorded per #1):** keep plugin v1's files without
vendoring via an aliased dependency
(`"plugin-react-refresh-v1": "npm:@rspack/plugin-react-refresh@1.0.0"`) —
zero runtime-file change for webpack/v1 users. Rejected: ships a permanently
frozen dead dependency to *all* users (v2 users included), splits the refresh
runtime across two sources of truth, and the maintainer independently blessed
vendoring (#1).

**Plan impact (PR 6).**
- Keep `setupManualReactRefresh` byte-equivalent to the old inline block
  except the three deltas above, so `git diff --color-moved` reads as a move.
- Explicit test matrix: webpack dev build + HMR (tester-app
  `webpack-start`), Rspack 1 lab, Rspack 2 lab — the smoke harness
  ([appendix](./appendix-smoke-harness/README.md)) already asserts the
  correct refresh-runtime source per major; add a webpack lab to it during
  PR 6/PR 7.

---

## #4 — `start.ts` deviates further from webpack; bridge the command paths

**Feedback.** The rspack and webpack command implementations should
ultimately converge instead of maintaining the same thing twice; this branch
widens the gap.

**Understanding.** Directional/architectural feedback about
`commands/rspack/*` vs `commands/webpack/*` duplication, triggered by the
`start.ts` diff.

**Validity: ✅ valid with nuance.** As a long-term direction, clearly right.
But the *new* divergence is small and mostly irreducible — diffing the two
`start.ts` files on the branch shows the gap is dominated by **pre-existing**
divergence (different `Compiler` constructor signatures, profiling env-vars,
`setupRspackEnvironment`, HMR typing). The branch adds exactly three rspack-
side pieces, none of which have a webpack counterpart to share:

1. The cache-warning call (v2-only concept — webpack's `cache` never moved).
2. `getRspackCacheConfig` in the `--reset-cache` path (same reason).
3. The documented `MultiRspackOptions` cast (type-level only; webpack's side
   compiles clean because *its* `devServer` augmentation matches).

**Plan impact.**
- **PRs 2/4**: keep the `start.ts` diff at the current minimal shape; where a
  pattern could apply to both bundlers (none of the current ones do), put it
  in `commands/common/`. The cache warning helper already lives in
  `commands/common/` even though only rspack calls it.
- **Root fix for the cast** (parked, noted in doc 08): align
  `@callstack/repack-dev-server`'s `proxy` types with rspack's bundled
  http-proxy-middleware copy — that removes the last irreducible cast.
- **Command-path bridging** is real but orthogonal work that predates this
  effort — record as a follow-up candidate (new dated folder), don't smuggle
  it into the Rspack 2 stack.

---

## #5 — Don't auto-migrate the user's cache config

**Feedback.** If a user bumps rspack, *they* migrate their config. Warning
is fine; silently fixing it is not. (Separately allowed: silently choosing
newer defaults when the user configures no caching at all.)

**Understanding.** Config ownership: Re.Pack should not mutate user-provided
config values at runtime, even helpfully — it blurs responsibility and can
mask a config that is wrong in the user's own CI/tooling.

**Validity: ✅ valid.** The original auto-migrate
(`migrateLegacyRspackCacheConfig`, doc 08 §4) honored user *intent* — under
v2 the legacy key is silently inert, so users would lose persistent caching
with no signal (verified, doc 07). But the maintainer's line is the safer
contract: **loud warning, no mutation**. The intent-honoring argument loses
because auto-migration makes Re.Pack behave differently from bare rspack
with the same config — exactly the class of magic that's hard to debug.

**Implementation (PR 4; applied to the reference branch 2026-07-02 — see
doc 08 § Reference branch updates):**

```ts
// commands/common/warnLegacyRspackCacheConfig.ts (renamed from migrate*)
let warningDisplayed = false;

/**
 * Rspack 2 moved persistent cache config from `experiments.cache` to the
 * top-level `cache` option and silently ignores the legacy key - users
 * migrating from Rspack 1 would lose caching with no signal. Warn (once),
 * but leave the config untouched: migrating it is the user's move.
 */
export function warnLegacyRspackCacheConfig(
  configs: RspackConfigurationWithLegacyCache[]
) {
  if (warningDisplayed) return;
  if (configs.every((c) => c.experiments?.cache === undefined)) return;
  warningDisplayed = true;
  console.warn(
    colorette.yellow(
      "Rspack 2 ignores the legacy 'experiments.cache' option, so persistent " +
        "caching is NOT enabled. Move the value to the top-level 'cache' " +
        'option in your Rspack config.\n'
    )
  );
}
```

No `config.cache = ...`, no `delete` — the inert key is left in place (v2
validation tolerates it, doc 07).

**Consequential decision** (recorded here): `getRspackCacheConfig` (PR 2)
*keeps* reading `experiments.cache ?? cache`. Under warn-only, the legacy
value is not the *effective* v2 config — but `--reset-cache` should still
clear a cache directory that a legacy-configured project populated while on
Rspack 1 (that directory is precisely the stale one). Reading both locations
is correct for the accessor's actual consumer.

**Parked (allowed, not required):** the maintainer explicitly permits
defaulting to newer cache options when the user configures nothing. Whether
Re.Pack should default-enable v2 persistent caching is a product decision —
belongs to the workspace-adoption/phase-4 follow-up, not this stack.

---

## #6 — `parallelLoader` was always per-rule; parallel is "default-on" in v2

**Feedback.** The experiments flag was just the global toggle; per-rule
`use[].parallel` was always the real switch; in Rspack 2 parallel loading is
enabled by default.

**Understanding + upstream verification (2026-07-02).**
- "Always per-rule" — **confirmed.** Under v1, parallel execution required
  `experiments.parallelLoader: true` *and* `parallel: true` on the rule.
- "Enabled by default in v2" — **imprecise.** The
  [v1→v2 migration guide](https://rspack.rs/guide/migration/rspack_1.x)
  says: *"loader parallelization is now stable and enabled by default, but
  you still need to configure `module.rules.use.parallel` to opt in"* — i.e.
  the *feature/infrastructure* no longer needs a global flag, but **no
  loader runs in parallel without per-rule opt-in**. The removal PR
  ([web-infra-dev/rspack#12658](https://github.com/web-infra-dev/rspack/pull/12658))
  states the same: *"You still need to use `loader.use.parallel` to enable
  this feature."*

**Validity: ⚠️ partially correct** — the conclusion the maintainer draws from
it is still right, though:

- Dropping `experiments.parallelLoader` from `getRepackConfig` under v2:
  **correct** (the key is gone; doc 07 verified it's silently ignored, not a
  validation error — doc 01 row 6's "schema validation error" severity needs
  that correction; its "opt-in stays via `use[].parallel`" claim was right
  all along).
- Skipping the loader's parallel-mode warning probe under v2: **correct, for
  a subtler reason than "parallel is default-on".** The probe's entire
  signal was the *global flag*: "you set `experiments.parallelLoader` but
  forgot `parallel: true` on this rule". Under v2 the global flag doesn't
  exist, so there is no way to distinguish "user wants parallel but
  misconfigured" from "user doesn't use parallel" — running non-parallel is
  a valid state, not a misconfiguration. The existing v2 skip stands:

```ts
// Rspack 2 removed `experiments.parallelLoader` (parallel loading is stable
// and opt-in per rule only), so there is no global flag to check against -
// running non-parallel is a valid choice there, not a misconfiguration
const rspackVersion = loaderContext._compiler?.webpack?.rspackVersion;
if (rspackVersion && Number(rspackVersion.split('.')[0]) >= 2) {
  return;
}
```

**Plan impact.**
- **PR 3** ships the gating as-is; the upstream verification demanded by
  doc 09 is hereby done (sources above).
- **Docs correction (PR 1, this folder):** doc 01 row 6 severity — "schema
  validation error" → "silently ignored" (doc 07 already established this;
  the row predates verification).
- **Parked idea for follow-up:** since per-rule opt-in still exists under
  v2, Re.Pack *could* default `parallel: true` in its own
  `getJsTransformRules` under v2 for build perf — needs its own
  verification (worker-context constraints on the loader: `_compiler` is
  unavailable in threaded mode, which `babelSwcLoader` handles, but the
  babel side has never been exercised under it). Not part of this stack.

---

## #7 — Test the ESM `require` flow on Windows

**Feedback.** Including monorepo setups and the super-app showcase.

**Understanding.** The dual-support mechanism leans on Node's `require(esm)`
and on filesystem resolution (`require.resolve` with `paths`), both of which
have Windows-specific failure lore (path separators, drive letters, symlink
realpath behavior in monorepos/pnpm).

**Validity: ✅ valid.** Nothing in the implementation *should* be
Windows-hostile — `require.resolve(..., { paths })` and `path.*` are used
throughout; no hand-built path strings — but "should" is exactly what a
smoke pass is for. The genuinely Windows-sensitive surfaces:

1. `getRspackVersion` / `isRspack2` — resolving `@rspack/core/package.json`
   from a *project* context (`paths: [context]`), especially under pnpm
   symlinked monorepos on Windows (junctions vs symlinks).
2. The lazy command chain — `await import('./ensureNodeCompat.js')` then the
   real command, compiled to CJS by babel.
3. `require(pluginPath)` of the ESM-only `@rspack/plugin-react-refresh@2`
   via an absolute Windows path (PR 6's
   `resolveReactRefreshPluginRequest`).
4. `require(esm)` of `@rspack/core` itself on Windows Node ≥20.19.

**Plan impact (PR 2, with the plugin-resolution part re-checked in PR 6).**
Windows smoke pass covering: repack build + unit suite (both majors) on a
Windows runner or VM, plus a v2 lab run of the appendix smoke harness in
(a) a standalone project, (b) a pnpm monorepo layout, (c) the super-app
showcase. A `windows-latest` GitHub Actions lane running the unit suite is
cheap and durable — worth adding in PR 2 even though the tester apps stay
manual.

---

## #8 — MFv1 changes look good

**Feedback.** Approval of the `ModuleFederationPluginV1`
`@module-federation/runtime-tools` pre-check.

**Validity: ✅ valid (approval).** No action; PR 5 ports it unchanged.

---

## Summary of revisions this evaluation adds to the plan

| # | Verdict | Revision |
| --- | --- | --- |
| 1 | ✅ confirmation | none |
| 2 | ✅ valid | PR 6: package-root `vendor/react-refresh/` shipped as-is + `files` entry + provenance/LICENSE + lint/build exclusions |
| 3 | ✅ valid w/ nuance | PR 6: keep manual path byte-equivalent modulo 3 enumerated deltas; explicit webpack HMR test; no plugin split; alias alternative recorded-rejected |
| 4 | ✅ valid w/ nuance | PRs 2/4: hold current minimal diff; dev-server proxy-type alignment parked as the cast's root fix; command bridging = separate follow-up effort |
| 5 | ✅ valid | PR 4: `warnLegacyRspackCacheConfig` — warn once, mutate nothing; accessor still reads both locations (reasoning above); default-cache-when-unset parked |
| 6 | ⚠️ partially correct | PR 3: gating ships as-is (upstream verified here); doc 01 row 6 severity correction; per-rule `parallel: true` default parked for follow-up |
| 7 | ✅ valid | PR 2: Windows smoke matrix (standalone / pnpm monorepo / super-app-showcase) + `windows-latest` unit-suite CI lane |
| 8 | ✅ approval | none |
