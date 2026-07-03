# PR Split Plan & Where We Left Off

> **STATUS / WHERE WE LEFT OFF (updated 2026-07-03):** All research,
> decisions, implementation (plan phases 0–2), feedback reworks, per-major
> tester apps, the default-catalog flip, and verification are complete,
> **committed, and pushed** on `feat/rspack-2-support` (`d0ea05d6..604392c8`;
> commit map in [doc 08](./08-implementation-notes.md)). CI on the branch is
> **green** (TypeScript, Tests, Lint). The next step is executing the split
> below. **The split has not been executed yet.**
>
> **Plan restructured 2026-07-02 (same day, after maintainer feedback) for
> parallel execution** — see "Why this structure" for the conflict analysis
> that drove it. The stack is now: docs + one foundations PR, then four
> mutually conflict-free PRs that can be authored/reviewed/merged in any
> order, then a closer PR and an Rspack 2 tester app (PR 8, decided
> 2026-07-02).
>
> **Reference branch updated 2026-07-02/03:** the feedback reworks are now
> **applied on `feat/rspack-2-support` itself** — warn-only cache (feedback
> #5), vendor-directory relocation (feedback #2), plus the PR 8 apps:
> **`tester-app` is now the Rspack 2 example** (on the workspace default
> catalog, which is Rspack 2 since the 2026-07-03 flip — doc 08 § Catalog
> flip) and **`apps/tester-app-rspack1`** is the special case — a
> standalone app outside the workspace, v1 via tarball-installed repack. A
> `loadRspack` project-context loading fix was implemented and then
> **reverted by decision (2026-07-03)** — shipped code must not carry
> monorepo-aware resolution workarounds; the standalone app solves the same
> problem at the fixture level. Details in
> [doc 08 § Reference branch updates](./08-implementation-notes.md); porting
> these pieces into their stack PRs is now a cherry-pick, not a rework.
>
> Branch strategy (agreed): `feat/rspack-2-support` stays as a **reference
> version** — kept locally and on the remote. Draft PR
> [#1393](https://github.com/callstack/repack/pull/1393) will be **closed
> (not merged)** once the stack PRs are open, and referenced from them.
>
> Maintainer feedback on #1393 is recorded below (distilled to the substance)
> and must be incorporated while building the stack.

## Maintainer feedback on #1393 (2026-07-02)

Overall verdict: *"PR looks mostly good / overally looks sensible"*, split into
~5 PRs confirmed as the right approach (everything must stay backwards
compatible — not aiming for a 6.0). Specific points, each mapped to an action
(PR references use the restructured numbering below). **Each point is
evaluated in depth — understanding, validity, implementation revision with
code examples — in [doc 10](./10-maintainer-feedback-evaluation.md).**

1. **Vendoring the React Refresh client files is fine.**
   `deprecated_runtimePaths` was originally used just for ease of use — no
   attachment to it. ✅ validates the doc 06 decision.
2. **BUT keep vendored code out of main `src/`** — put it in a dedicated
   `vendor` directory instead of `src/modules/reactRefresh/`.
   → **Action (PR 6 — React Refresh):** relocate the vendored files (note:
   `vendor/` outside `src/` ships as-is rather than through babel — the files
   are plain JS, so add the dir to `package.json#files` and point the manual
   wiring at it; or use `src/vendor/` if build-processing is preferred —
   decide during PR 6).
3. **Revisit the React Refresh / DevelopmentPlugin changes and minimize their
   footprint.** `DevelopmentPlugin` is used by BOTH rspack and webpack — test
   both paths. The expectation is that little actually *needed* to change
   beyond cleaning up deprecated usage; splitting the plugin per-bundler was
   floated as an option if the refresh plugin diverged that much.
   → **Action (PR 6 — React Refresh):** re-examine how small the diff can be;
   explicitly test the webpack path; consider (but don't default to) a
   per-bundler split.
4. **`start.ts` changes are further deviation from webpack** — the rspack and
   webpack command paths should ultimately be bridged to avoid maintaining
   the same thing twice.
   → **Action (PRs 2 and 4 — the two that touch `start.ts`):** keep
   `start.ts` diffs minimal; where a change is needed (Node guard, lazy
   loading, cache handling), either mirror the same approach in the webpack
   commands or structure it as shared code.
5. **Don't auto-migrate the user's cache config.** If a user bumps rspack,
   *they* should migrate their config. It's fine to **silently set newer
   options when the project doesn't configure caching at all** (we know which
   rspack version is targeted).
   → **DECISION OVERRIDE (2026-07-02):** replaces the earlier "honor the
   legacy value by copying it over" decision (docs 03 §1.2 / 08). New
   behavior for PR 4 (cache): when v2 + `experiments.cache` is set, **warn
   only** (clear message pointing at top-level `cache`) — do not copy the
   value.
6. **`parallelLoader` was always per-rule** — the experiments flag was just
   the global toggle, and in Rspack 2 parallel loading is **enabled by
   default**.
   → **Action (PR 3 — config routing):** verify against upstream (our docs
   assumed per-rule opt-in remained); if parallel is default-on under v2, our
   loader's parallel-mode warning is fully obsolete there (current code
   already skips it under v2 — confirm that's the right call) and docs 01/02
   need a small correction.
7. **The ESM `require` flow needs testing on Windows** — including monorepo
   setups and the super-app showcase.
   → **New verification item (PR 2 — foundations):** Windows smoke pass for
   the require(esm) loading path and path handling in the version helpers.
8. **MFv1 changes look good.** ✅ no action.

## Why this structure (decision, 2026-07-02)

The original stack (docs → foundations → types → config routing → React
Refresh) serialized on the "compile against Rspack 2 types" PR: mapping each
planned PR onto the actual files changed on `feat/rspack-2-support` showed it
conflicted with **both** downstream PRs, on top of the logical dependency
(the cache types don't compile against v1-only types):

| Overlap | Colliding PRs (old numbering) | Cause |
| --- | --- | --- |
| `start.ts`, `bundle.ts` | types ↔ config routing | devServer type handling vs. cache-warning call sites |
| `loaders/babelSwcLoader/*` | types ↔ config routing | `SwcConfig` alias / transformSync split vs. parallel-probe change |
| `package.json` + `pnpm-lock.yaml` | types ↔ React Refresh | `@rspack/core@^2` devDep bump vs. react-refresh dependency change |

Everything in the types PR is **behavior-neutral** (type fallout, devDep
bump, Jest infrastructure, cache accessor) — the same review theme as the
foundations PR ("zero runtime change for existing users"). Folding it into
foundations removes every conflict and every inter-PR dependency in one move.
Cost: a chunkier foundations PR (~15 files + lockfile), all mechanical, and
all already reviewed as part of #1393.

The four PRs that follow were re-checked pairwise against the branch diff:
**no shared files** (the cache PR is the only one touching `start.ts`/
`bundle.ts`; React Refresh is the only one touching `package.json`;
changesets get uniquely-named files per PR).

## The stack

Each PR is independently green: typecheck, build, `pnpm test` under **both
majors** (see testing strategy below), biome — plus the per-PR verification
noted inline.

### Sequential prefix

#### PR 1 — Rspack 2 adoption plan (documentation)
- Introduces `agent_context/` (convention + `README.md` index, `AGENTS.md`
  pointer) and `agent_context/rspackv2-jul2026/` with all documents 01–09 and
  the [smoke-harness appendix](./appendix-smoke-harness/README.md).
- No code changes. Title: "docs: rspack 2 adoption plan".
- **Fully independent** — can be opened immediately and merged at any point;
  it is "first" only in spirit.

#### PR 2 — Foundations (the single blocking PR)
Absorbs the old "types" PR; theme: *Re.Pack builds and tests green against
Rspack 2 with zero runtime behavior change for Rspack 1 / webpack users.*
- `helpers/rspackVersion.ts` (+ helpers index export)
- `commands/rspack/ensureNodeCompat.ts` + lazy command loading in
  `commands/rspack/index.ts`
- Note: `@rspack/core` is loaded with a plain import — **no project-context
  resolution** (a `loadRspack` workaround was implemented and reverted by
  decision 2026-07-03; the in-workspace devDep-shadowing consequence and the
  standalone-app answer are documented in doc 08 § Discovery)
- `profile/index.ts` refactor onto the version helper
- `packages/repack` devDeps: `@rspack/core@^2.1.2`, `@swc/helpers@^0.5.23`
  (workspace catalog stays v1)
- Type fallout: `SwcConfig` alias, transformSync loader-only-options split,
  `bundle.ts` devServer destructure, the single documented cast in `start.ts`,
  `RepackTargetPlugin` devServer narrowing, `ConfigKeys` additions
- `getRspackCacheConfig` + derived cache types (the accessor is
  behavior-neutral; the *warning* that uses it lands in PR 4 — cross-link)
- Jest custom environment + bridge, **extended to dual-major** (see testing
  strategy) + CI lane running the unit suite under Rspack 1
- Verification per maintainer feedback #7: **Windows** smoke pass of the
  require(esm) loading path — standalone project, pnpm monorepo, and
  super-app-showcase — plus a `windows-latest` CI lane running the unit suite
  under both majors (specifics in [doc 10 §7](./10-maintainer-feedback-evaluation.md))
- Patch changeset at most (friendlier Node error is the only user-visible
  change).

### Parallel set — branch each from `main` after PR 2 merges

No ordering between these four; no shared files; author/review/merge in any
order. Each carries its own uniquely-named changeset (patch-level where
user-visible).

#### PR 3 — Config routing
- `getRepackConfig`: `parallelLoader` gating + `exportsPresence: 'auto'`
- Version-aware parallel-mode warning probe in babelSwcLoader — the upstream
  verification of feedback #6 is **done** (2026-07-02, [doc 10 §6](./10-maintainer-feedback-evaluation.md)):
  per-rule opt-in still required under v2, only the global flag is gone; the
  gating ships as-is, and docs 01/02 are already corrected
- `profile-2.ts` (logger trace layer default under v2) + `profile/index.ts`
  wiring
- Files: `commands/common/config/getRepackConfig.ts`,
  `loaders/babelSwcLoader/*` (probe only), `commands/rspack/profile/*`

#### PR 4 — Legacy cache config warning
- **Warn-only** per maintainer feedback #5 — **applied on the reference
  branch 2026-07-02**: `migrateLegacyRspackCacheConfig` (auto-migrate) is now
  `warnLegacyRspackCacheConfig` — under v2 with `experiments.cache` set, it
  emits a one-time actionable warning pointing at top-level `cache` and
  leaves the config untouched; porting is a straight cherry-pick
- Call sites in `start.ts` / `bundle.ts` — keep diffs minimal / mirrored in
  webpack commands (feedback #4)
- Files: `commands/common/warnLegacyRspackCacheConfig.ts` (renamed from
  `migrateLegacyRspackCacheConfig.ts`), `commands/common/index.ts`,
  `commands/rspack/start.ts`, `commands/rspack/bundle.ts`

#### PR 5 — MFv1 runtime-tools pre-check
- `ModuleFederationPluginV1.apply` verifies
  `@module-federation/runtime-tools` is resolvable under rspack≥2 with an
  actionable error (maintainer-approved, feedback #8)
- Files: `plugins/ModuleFederationPluginV1.ts` only — the smallest PR.

#### PR 6 — React Refresh restructure
- Vendored client files — relocated to a dedicated **vendor directory**
  (feedback #2) — **applied on the reference branch 2026-07-02**:
  package-root `packages/repack/vendor/react-refresh/` with an upstream
  LICENSE/provenance file, shipped as-is via `package.json#files`, excluded
  from biome; `DevelopmentPlugin` major split;
  `@rspack/plugin-react-refresh@1.0.0` dependency → `^2` optional peer
- Footprint approach decided ([doc 10 §3](./10-maintainer-feedback-evaluation.md),
  feedback #3): keep `setupManualReactRefresh` byte-equivalent to the old
  inline wiring except the three enumerated deltas (runtime-file source,
  define-flag swap, `include:` → `test:`), so the diff reads as a move; no
  per-bundler plugin split; explicitly test the **webpack** path (tester-app
  `webpack-start` HMR) alongside both rspack majors
- The riskiest PR for dev experience; needs its own manual HMR pass (both
  majors + webpack)
- Files: `plugins/DevelopmentPlugin.ts`, vendored files, `package.json`,
  lockfile

### Closer

#### PR 7 — Dual-major smoke suite + headline changeset
- Formalize the [appendix smoke harness](./appendix-smoke-harness/README.md)
  into a committed suite (e.g. `tests/rspack-compat/`, following the existing
  `tests/*` conventions) that builds the repack dist and asserts the full
  behavior matrix under **both** `1.7.12` and `2.1.2`: config routing, cache
  warning (update assertion 2b to warn-only), Node guard, dev build with
  HMR + React Refresh from the correct source per major
- CI wiring for the smoke lane
- Carries the headline **minor changeset** ("Rspack 2 support") — solves the
  old "goes on whichever merges last" problem, since with parallel merging
  that's unpredictable; the feature is also genuinely not "shipped" until
  everything above is in
- Depends on PRs 3–6 (it asserts their behavior), which is fine: it's the
  fan-in.

#### PR 8 — per-major tester apps (restructured 2026-07-03; implemented on the reference branch)
Both majors get an app-level validation surface for the whole dual-support
window:

- **`apps/tester-app` becomes the Rspack 2 example** (maintainer decision
  2026-07-03). In-workspace it already *runs* repack's devDep major (v2, see
  doc 08 § Discovery) — this just makes the manifest honest: `@rspack/core`
  + `@swc/helpers` pin the workspace **default catalog** (Rspack 2 since the
  2026-07-03 flip; an interim `rspack2` named catalog existed for a few
  hours and was folded into the default same day), and it gains
  `@rspack/plugin-react-refresh: catalog:` plus a direct
  `react-refresh@^0.18.0` (pnpm-strict layouts don't hoist repack's copy
  into the official plugin's scope — doc 08 lab note). No other changes —
  full feature surface (assets matrix incl. remote, async/remote chunks,
  mini-apps, nativewind, reanimated, webpack lane) stays where it always
  was. Known cosmetic wart: `postcss-loader@8` declares peer
  `@rspack/core@"0.x || 1.x"` → one unmet-peer install warning.
- **`apps/tester-app-rspack1` is the special case** — a **standalone** app
  on Rspack 1, *outside* the workspace (negation glob + own
  `pnpm-workspace.yaml`) with its own `node_modules` and repack installed
  from a packed tarball (`pnpm run pack-repack`). Required because
  in-workspace, repack's `@rspack/core@^2` devDep shadows any app's v1 pin —
  and the shipped code deliberately carries no monorepo-aware resolution
  workaround (`loadRspack` reverted by decision, 2026-07-03). Minimal own
  src (async local chunk + HMR target), not shared with tester-app (a
  shared src would resolve two copies of react across the workspace
  boundary).

An interim shape (a third app, `tester-app-rspack2`, as a shared-src
workspace mirror with tester-app staying nominally on v1) was built,
device-verified, and **removed the same day** — in-workspace no app can
genuinely run v1, so "tester-app stays on v1" was illusory and the mirror
was redundant with tester-app itself.

Other notes:
- The **default catalog** in `pnpm-workspace.yaml` carries
  `@rspack/core: ^2.1.2`, `@swc/helpers: ^0.5.23`,
  `@rspack/plugin-react-refresh: ^2.0.2` (flipped 2026-07-03 — doc 08
  § Catalog flip; the earlier plan kept the default on v1 until phase 3,
  but the v1 default was cosmetic given devDep shadowing). Porting note:
  this workspace change ships together with the integration-test v2 fixes
  (see § Mechanics).
- Node floor is a non-issue: the monorepo already requires Node ≥24.
- No CI wiring — tester apps are a manual validation surface; device e2e
  stays in the follow-up. No changeset (private apps).
- Sequencing: branch after PRs 2/3/6 are merged (before the React Refresh
  PR, tester-app cannot run dev mode under v2 by design). Can proceed in
  parallel with PR 7 — the only shared file is the lockfile.
- Lifecycle: tester-app is already the v2 primary; `tester-app-rspack1`
  retires when Rspack 1 support ends at the next major.

### Follow-up — workspace adoption (phase 3, separate effort)

> ✅ **Partially executed early (2026-07-03, reference branch):** the
> default pnpm catalog was flipped to `@rspack/core@^2.1.2` (the named
> `rspack2` catalog is gone; tester-app pins plain `catalog:` again and both
> federation apps declare `@rspack/plugin-react-refresh`). Rationale: the
> v1 default was cosmetic — every workspace consumer already *ran* 2.1.2
> via repack's devDep (doc 08 § Discovery), so manifests now match reality.
> The flip surfaced the first true-v2 run of `tests/integration`'s rspack
> lane; findings and test fixes in doc 08 § Catalog flip. Remaining
> phase-3 items below still stand.

- CI matrix lanes (Node 18/20 = v1-only),
  metro-compat + resolver-cases sweeps, device HMR e2e — run against **both**
  tester apps now that each major has one (the earlier "bump tester-app to
  v2" item is superseded by PR 8)
- **Module Federation validation** (doc 03 §2.3, amended 2026-07-03):
  establish/document the supported `@module-federation/enhanced` range per
  major; run `tester-federation` / `tester-federation-v2` — which
  in-workspace covers **v2 only** (devDep shadowing, doc 08 § Discovery).
  True-v1 federation coverage needs a standalone lab following the
  `tester-app-rspack1` tarball-install pattern (+ enhanced); the stack
  itself ships only PR 5's runtime-tools pre-check for MFv1 under v2.
- Per the agent_context lifecycle this is follow-up work → **new dated
  folder** (e.g. `rspackv2-adoption-<month><year>/`) linking back here.
- Also parked for later (phase 4, decided): flipping `repack-init`/templates/
  website defaults to Rspack 2, website migration guide. (tester-app is
  already the v2 example as of PR 8's 2026-07-03 restructure;
  `tester-app-rspack1` retires when v1 support ends.)

## Testing both majors (added 2026-07-02)

Three layers; the first two are what the stack itself must provide.

### 1. Unit tests under both majors (PR 2)

> **Implemented on the reference branch 2026-07-03** exactly as specced
> below (cross-env chosen for the script; plus a guard test,
> `src/__tests__/rspackTestLane.test.ts`, asserting the loaded major matches
> the requested lane — added after an external doc review caught that the
> lane had been *described as verified before it existed*; see doc 08
> § Correction). 281/281 green under both majors. Remaining PR 2 work: the
> CI lane.

The custom Jest environment already loads the real `@rspack/core` outside the
sandbox (doc 08). Parameterize it on an env var instead of hard-coding v2:

- Add an aliased devDep to `packages/repack`:
  `"@rspack/core-v1": "npm:@rspack/core@^1.7.12"` (plain version, not the
  workspace catalog).
- `jest.environment.js` picks by `process.env.RSPACK_MAJOR` (default `2`):
  v2 via `await import('@rspack/core')` as today; v1 via plain
  `require('@rspack/core-v1')` — the environment runs outside the Jest
  sandbox with Node's real module system, and using `require` for the CJS v1
  package sidesteps any reliance on cjs-module-lexer named-export synthesis.
  The existing bridge (`__esModule: true` + spread) serves both shapes
  unchanged.
- Expose `this.global.__RSPACK_MAJOR__` so tests can gate major-specific
  assertions (e.g. `exportsPresence` expectations in `getRepackConfig`
  tests).
- Scripts: keep `"test": "jest"` (v2) and add
  `"test:rspack1": "RSPACK_MAJOR=1 jest"` (use `cross-env` if the script
  must also run on Windows shells — decide in PR 2 alongside the feedback #7
  Windows pass).
- PR 2 must bring the suite green under v1 (done on the reference branch —
  281 tests incl. the lane guard) and add a CI lane for it.

Caveats, recorded so they don't surprise: **types are always v2** — the
`@rspack/core` devDep stays at `^2`, so type-only imports check against v2
while the runtime object under `RSPACK_MAJOR=1` is v1; that's the intended
shape (source must *compile* against v2, *run* against both). And the aliased
package means two rspack binaries in `node_modules` — dev-machine disk, not a
publish concern (devDep only).

**Per-PR requirement for PRs 3–6:** run `pnpm test` **and**
`pnpm test:rspack1`; any test asserting major-divergent behavior must
gate on the exposed major rather than assuming v2. Note the lane's honest
scope: in-workspace, version *detection* still resolves repack's own v2
devDep, so the v1 lane exercises the real v1 core object and compilations,
not version-routing logic (doc 08 § Correction).

### 2. Built-dist smoke tests under both majors (PR 7)

Unit tests exercise sources through the Jest/Babel pipeline; the failure
modes that bit during implementation (require(esm) interop, loader
resolution, refresh runtime source selection) only reproduce against the
**built dist** in a real project layout. That's the appendix harness,
formalized: two lab fixtures (v1: `@rspack/core@^1.7.12`; v2: `@rspack/core@
^2.1.2` + `@rspack/plugin-react-refresh@^2` + `react-refresh` +
`@swc/helpers`), one assertion script that auto-detects the installed major.
Setup notes and the exact manifests are in the
[appendix README](./appendix-smoke-harness/README.md).

### 3. App-level manual validation (PR 8) + workspace/e2e (follow-up)

PR 8 gives each major its own tester app — `tester-app` (workspace, v2,
the full feature surface: dev server, HMR/React Refresh via the official
plugin, async/remote chunks + mini-apps, assets matrix incl. remote,
nativewind/reanimated plugin paths) and `tester-app-rspack1` (standalone
outside the workspace, v1 via tarball-installed repack: dev server, HMR
through the vendored runtime, async local chunks; minimal own src). The v1
app must be standalone because in-workspace apps always run repack's devDep
major (doc 08 § Discovery). Automated device HMR e2e, metro-compat /
resolver-cases sweeps under v2, and the full CI Node-version matrix belong
to the workspace-adoption follow-up folder — they test *adoption*, not the
dual-support contract itself.

## Mechanics for executing the split

- PR 1's branch cuts from `main` immediately. PR 2's branch cuts from `main`;
  materialize its file set via `git checkout feat/rspack-2-support -- <paths>`
  (the dual-major Jest parameterization is on the reference branch as of
  2026-07-03 — cherry-pick, no longer new work).
- **PRs 3–6 branch from `main` only after PR 2 merges** — not from PR 2's
  branch — so nothing needs retargeting/rebasing and the parallel set stays
  coordination-free. PRs 7 and 8 branch from `main` after PRs 3–6 are in
  (they may run in parallel with each other; only the lockfile overlaps).
- Deltas from the reference branch, status as of 2026-07-02: cache
  **warn-only** rework (PR 4, feedback #5) — **applied on the branch**;
  vendor-directory relocation (PR 6, feedback #2) — **applied on the
  branch**; parallel-default verification (PR 3, feedback #6) — **done**
  (doc 10 §6). Remaining porting-time delta: the DevelopmentPlugin
  footprint check via `git diff --color-moved` against pre-branch `main`
  (PR 6, feedback #3). The branch also gained the two PR 8 tester apps;
  a `loadRspack` project-context loader was implemented and **reverted**
  (2026-07-03 decision — no monorepo workarounds in shipped code).
- **Catalog flip + integration-test v2 fixes travel together** (2026-07-03,
  commits `41cc2d30`/`926ff298`/`55b6739e`): the default-catalog flip is what
  puts the workspace integration rspack lane on v2, and the
  `NativeEntryPlugin.test.ts` changes (version-agnostic markers, Rspack 2
  module-factory regex, ANSI + URL-encoded-path normalization in
  normalizeBundle, regenerated rspack-lane snapshots) are required for it to
  be green — port them in the same PR (fits PR 8 or the workspace-adoption
  slice). When regenerating rspack-lane snapshots, run once with
  `FORCE_COLOR=3` locally to surface env-dependent output before CI does
  (doc 08 § CI snapshot portability).
- Re-run per branch: `pnpm turbo run typecheck test --force` at the root,
  `pnpm test:rspack1` in `packages/repack` (the v1 jest lane), `pnpm lint:ci`.
  For app-level checks: `pnpm bundle` in `apps/tester-federation` (plus the
  `USE_WEBPACK=1` lane) and `pnpm run pack-repack && pnpm install &&
  pnpm bundle:ios bundle:android` in `apps/tester-app-rspack1`.
- Changesets: uniquely-named file per PR (no conflicts); patch-level on PRs
  2–5 where user-visible, the headline minor ("Rspack 2 support") on PR 7.
  The reference branch's single `.changeset/rspack-2-support.md` gets split
  accordingly.
- After all stack PRs are open: close #1393 with a comment linking the stack
  and this folder.

## Context for a fresh start (read this first)

Reading order for picking this effort up without prior context:

1. [README.md](./README.md) — index + TL;DR
2. [09 (this doc)](./09-pr-split-plan.md) — current state + next actions
3. [08-implementation-notes.md](./08-implementation-notes.md) — what's on the
   reference branch and the technical landmines
4. Docs 01–07 as needed for the *why* behind any specific change

Key working agreements captured along the way:
- **No type casts** (`as X` / `as unknown as X`) — use `satisfies`, narrowing,
  or fix the root cause; irreducible cases get a full reasoning comment and a
  review call-out (details in doc 08).
- **No monorepo leaks in shipped code** (Daniel, 2026-07-03) — published
  package code must behave like any normal package (plain imports, no
  workspace-aware resolution); workspace-only testing problems get solved at
  the fixture level (standalone apps, tarball installs — see doc 08
  § Discovery and `apps/tester-app-rspack1`), never in `src/`.
- Decisions get recorded inline in these docs with dates (see docs 04/06).
- `agent_context/` lifecycle: living while in flight, settled once merged —
  follow-ups get a new dated folder.
