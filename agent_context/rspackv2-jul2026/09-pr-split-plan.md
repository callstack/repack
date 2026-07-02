# PR Split Plan & Where We Left Off

> **STATUS / WHERE WE LEFT OFF (2026-07-02):** All research, decisions,
> implementation (plan phases 0–2), and verification are complete on branch
> `feat/rspack-2-support` (see [08-implementation-notes.md](./08-implementation-notes.md)).
> The next step is splitting that branch into the PR stack below, starting
> with PR 1 (this documentation). **The split has not been executed yet.**
>
> Branch strategy (agreed): `feat/rspack-2-support` stays as a **reference
> version** — kept locally and on the remote. Draft PR
> [#1393](https://github.com/callstack/repack/pull/1393) will be **closed
> (not merged)** once the stack PRs are open, and referenced from them.
>
> Maintainer feedback on #1393 is recorded below (distilled to the substance) and must be incorporated
> while building the stack.

## Maintainer feedback on #1393 (2026-07-02)

Overall verdict: *"PR looks mostly good / overally looks sensible"*, split into
~5 PRs confirmed as the right approach (everything must stay backwards
compatible — not aiming for a 6.0). Specific points, each mapped to an action:

1. **Vendoring the React Refresh client files is fine.**
   `deprecated_runtimePaths` was originally used just for ease of use — no
   attachment to it. ✅ validates the doc 06 decision.
2. **BUT keep vendored code out of main `src/`** — put it in a dedicated
   `vendor` directory instead of `src/modules/reactRefresh/`.
   → **Action (PR 5):** relocate the vendored files (note: `vendor/` outside
   `src/` ships as-is rather than through babel — the files are plain JS, so
   add the dir to `package.json#files` and point the manual wiring at it; or
   use `src/vendor/` if build-processing is preferred — decide during PR 5).
3. **Revisit the React Refresh / DevelopmentPlugin changes and minimize their
   footprint.** `DevelopmentPlugin` is used by BOTH rspack and webpack — test
   both paths. The expectation is that little actually *needed* to change
   beyond cleaning up deprecated usage; splitting the plugin per-bundler was
   floated as an option if the refresh plugin diverged that much.
   → **Action (PR 5):** re-examine how small the diff can be; explicitly test
   the webpack path; consider (but don't default to) a per-bundler split.
4. **`start.ts` changes are further deviation from webpack** — the rspack and
   webpack command paths should ultimately be bridged to avoid maintaining
   the same thing twice.
   → **Action (PRs 2–4):** keep `start.ts` diffs minimal; where a change is
   needed (Node guard, lazy loading, cache handling), either mirror the same
   approach in the webpack commands or structure it as shared code.
5. **Don't auto-migrate the user's cache config.** If a user bumps rspack,
   *they* should migrate their config. It's fine to **silently set newer
   options when the project doesn't configure caching at all** (we know which
   rspack version is targeted).
   → **DECISION OVERRIDE (2026-07-02):** replaces the earlier "honor the
   legacy value by copying it over" decision (docs 03 §1.2 / 08). New
   behavior for PR 4: when v2 + `experiments.cache` is set, **warn only**
   (clear message pointing at top-level `cache`) — do not copy the value.
6. **`parallelLoader` was always per-rule** — the experiments flag was just
   the global toggle, and in Rspack 2 parallel loading is **enabled by
   default**.
   → **Action (PR 4):** verify against upstream (our docs assumed per-rule
   opt-in remained); if parallel is default-on under v2, our loader's
   parallel-mode warning is fully obsolete there (current code already skips
   it under v2 — confirm that's the right call) and docs 01/02 need a small
   correction.
7. **The ESM `require` flow needs testing on Windows** — including monorepo
   setups and the super-app showcase.
   → **New verification item (PR 3 / phase 3):** Windows smoke pass for the
   require(esm) loading path and path handling in the version helpers.
8. **MFv1 changes look good.** ✅ no action.

## The stack

Ordered by merge order; each PR is independently green (typecheck, build,
tests, lint, and the dual-major smoke tests from doc 08 where applicable).

### PR 1 — Rspack 2 adoption plan (documentation)
- Introduces `agent_context/` (convention + `README.md` index, `AGENTS.md`
  pointer) and `agent_context/rspackv2-jul2026/` with all documents 01–09.
- No code changes. Title: "docs: rspack 2 adoption plan".

### PR 2 — Foundations & guards
- `helpers/rspackVersion.ts` (+ helpers index export)
- `commands/rspack/ensureNodeCompat.ts` + lazy command loading in
  `commands/rspack/index.ts`
- `profile/index.ts` refactor onto the version helper
- Zero behavior change for Rspack 1 / webpack users. No changeset-worthy
  user-visible behavior beyond the friendlier error (patch changeset at most).

### PR 3 — Compile against Rspack 2 types
- `packages/repack` devDeps: `@rspack/core@^2.1.2`, `@swc/helpers@^0.5.23`
  (workspace catalog stays v1)
- Type fallout: `SwcConfig` alias, transformSync loader-only-options split,
  `bundle.ts` devServer destructure, the single documented cast in `start.ts`,
  `RepackTargetPlugin` devServer narrowing, `ConfigKeys` additions
- `getRspackCacheConfig` + derived cache types (**must** be here — the old
  `experiments.cache`-derived type doesn't compile against v2 types)
- Jest custom environment + bridge (`jest.environment.js`,
  `jest.rspack-core-bridge.js`, `jest.config.js`)
- Note for reviewers: the cache *types* land here; their runtime purpose
  completes in PR 4 (cross-link the PRs).
- Verification to add per maintainer feedback #7: **Windows** smoke pass of
  the require(esm) loading path (monorepo + super-app-showcase setups).

### PR 4 — Route renamed/moved config options
- `getRepackConfig`: `parallelLoader` gating + `exportsPresence: 'auto'`
- Legacy cache config handling in `start`/`bundle` — **warn-only** per
  maintainer feedback #5 (rework the reference branch's auto-migrate
  behavior before porting it over)
- Version-aware parallel-mode warning probe in babelSwcLoader — first verify
  maintainer feedback #6 (parallel default-on in v2) against upstream
- `profile-2.ts` (logger trace layer default under v2)
- MFv1 `@module-federation/runtime-tools` pre-check (maintainer-approved)
- Keep `start.ts` diffs minimal / mirrored in webpack commands (feedback #4)
- Depends on PR 2 (`isRspack2`) and PR 3 (cache types).

### PR 5 — React Refresh restructure
- Vendored client files — relocated to a dedicated **vendor directory**, not
  `src/modules/` (maintainer feedback #2); `DevelopmentPlugin` split;
  `@rspack/plugin-react-refresh@1.0.0` dependency → `^2` optional peer
- Re-examine how small the `DevelopmentPlugin` diff can be and explicitly
  test the **webpack** path (feedback #3)
- Depends on PR 2 only (`getRspackMajorVersionFromCompiler`) — can be
  reviewed in parallel with PR 3/4
- The riskiest PR for dev experience; needs its own manual HMR pass
- The headline **minor changeset** ("Rspack 2 support") goes on whichever of
  PR 4 / PR 5 merges last.

### PR 6+ — Workspace adoption (phase 3, separate effort)
- Catalog/tester-app/tests bump to v2, CI matrix lanes (Node 18/20 = v1-only),
  metro-compat + resolver-cases sweeps, device HMR e2e
- Per the agent_context lifecycle this is follow-up work → **new dated
  folder** (e.g. `rspackv2-adoption-<month><year>/`) linking back here.
- Also parked for later (phase 4, decided): flipping `repack-init`/templates/
  website defaults to Rspack 2, website migration guide.

## Mechanics for executing the split

- Cut `feat/rspack-2-01-*` (naming TBD) from `main`; materialize each PR's
  file set via `git checkout feat/rspack-2-support -- <paths>`; stack each
  branch on the previous one (PR 5's branch on PR 2's if reviewed in
  parallel, rebased as the stack merges).
- Re-run per-branch: `pnpm typecheck && pnpm build && pnpm test` in
  `packages/repack`, `npx biome check`, plus the doc 08 smoke tests for
  PRs 3–5.
- Split the single changeset (`.changeset/rspack-2-support.md`) across the
  stack as described above.
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
- Decisions get recorded inline in these docs with dates (see docs 04/06).
- `agent_context/` lifecycle: living while in flight, settled once merged —
  follow-ups get a new dated folder.
