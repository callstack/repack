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
> Maintainer feedback on #1393 is recorded below and must be incorporated
> while building the stack.

## Maintainer feedback on #1393

> _To be filled in — feedback received from the PR maintainer, to incorporate
> before/while creating the stack._

<!-- PENDING: paste maintainer feedback here -->

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

### PR 4 — Route renamed/moved config options
- `getRepackConfig`: `parallelLoader` gating + `exportsPresence: 'auto'`
- `migrateLegacyRspackCacheConfig` + wiring in `start`/`bundle`
- Version-aware parallel-mode warning probe in babelSwcLoader
- `profile-2.ts` (logger trace layer default under v2)
- MFv1 `@module-federation/runtime-tools` pre-check
- Depends on PR 2 (`isRspack2`) and PR 3 (cache types).

### PR 5 — React Refresh restructure
- Vendored client files (`src/modules/reactRefresh/`), `DevelopmentPlugin`
  split, `@rspack/plugin-react-refresh@1.0.0` dependency → `^2` optional peer
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
