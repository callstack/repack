# Rspack 2.0 Support — Research & Planning

> Status: **Implemented on the reference branch, pending PR split** — core
> dual-version support (plan phases 0–2) is complete and verified on
> `feat/rspack-2-support` (kept as a reference; draft PR #1393 to be closed in
> favor of a PR stack). The maintainer-feedback reworks are **applied on the
> branch itself** (warn-only cache, vendor directory), `tester-app` is now
> the **Rspack 2 example**, the workspace **default catalog is Rspack 2**
> (doc 08 § Catalog flip), and the standalone `apps/tester-app-rspack1`
> (outside the workspace, tarball-installed repack) is the Rspack 1 lane —
> all device-verified incl. HMR and the interactive chunk/asset flows.
> **Where we left off + next actions: see
> [09-pr-split-plan.md](./09-pr-split-plan.md).**
> All decisions recorded (Q1–Q5 in doc 04, React Refresh in doc 06, feedback
> responses + reversals in docs 08–10), V1–V11 verification executed with no
> blockers (doc 07), implementation details + reference-branch updates in
> doc 08.
> Last updated: 2026-07-03

This folder tracks the investigation and plan for adding Rspack 2.0 support to Re.Pack
while keeping Rspack 1.x working (dual-version support).

## Documents

| Doc | Contents |
| --- | --- |
| [01-breaking-changes-inventory.md](./01-breaking-changes-inventory.md) | Every Rspack 2.0 breaking change (from the official discussion + migration guide), each mapped to its impact on Re.Pack |
| [02-impact-analysis.md](./02-impact-analysis.md) | Detailed codebase findings: what actually breaks, with file/line references |
| [03-dual-version-support-plan.md](./03-dual-version-support-plan.md) | Implementation plan for supporting Rspack 1.x and 2.x from a single Re.Pack release |
| [04-questions-and-blockers.md](./04-questions-and-blockers.md) | Open questions, concerns, and potential blockers to resolve before/while implementing |
| [05-user-benefits.md](./05-user-benefits.md) | What Rspack 2.0 gives Re.Pack users (performance, bundle size, DX) |
| [06-react-refresh-deep-dive.md](./06-react-refresh-deep-dive.md) | Deep dive: what `deprecated_runtimePaths` is, why v2 removed it, and the supported v2 approach (`injectEntry`/`reactRefreshLoader` options) |
| [07-verification-results.md](./07-verification-results.md) | Executed V1–V11 verification results against `@rspack/core@2.1.2` — no blockers; two impact-analysis revisions and one new work item (perfetto tracing) |
| [08-implementation-notes.md](./08-implementation-notes.md) | What was built on the reference branch: commits, technical landmines (Jest ESM escape, v2 type fallout patterns), working agreements, verification performed — **plus the reference-branch updates**: applied feedback reworks, the devDep-shadowing discovery and the `loadRspack` implement-then-revert decision, per-major tester apps, and the on-device validation record (incl. interactive chunk/remote-asset flows) |
| [09-pr-split-plan.md](./09-pr-split-plan.md) | **Where we left off** — the agreed PR stack, restructured for parallel execution (docs + foundations → 4 conflict-free parallel PRs → closer + per-major tester apps: tester-app as the v2 example, standalone tester-app-rspack1 as the v1 lane), dual-major testing strategy, branch/PR strategy, maintainer feedback, and reading order for a fresh start |
| [10-maintainer-feedback-evaluation.md](./10-maintainer-feedback-evaluation.md) | Point-by-point evaluation of the #1393 maintainer feedback — understanding, validity verdict (with upstream verification of #6), and the concrete implementation revision per point, with code examples |
| [appendix-smoke-harness/](./appendix-smoke-harness/README.md) | Verification artifact: the dual-major smoke script + lab setup used for doc 07/08 verification, preserved as the seed for the closer PR's committed smoke suite |

## TL;DR

Dual support (Rspack 1 + 2) is **feasible with a moderate amount of work**. Re.Pack is in
good shape because it configures almost everything explicitly rather than relying on
Rspack defaults, and it already has a version-branching precedent
(`packages/repack/src/commands/rspack/profile/index.ts`).

**3 confirmed breaks in Re.Pack code** (severity revised after lab verification — doc 07):

1. `experiments: { parallelLoader: true }` injected by `getRepackConfig` — the option was
   removed in Rspack 2. *Verified: silently ignored, not a validation error* — dead config
   plus a permanently-silent parallel-mode warning probe; still must be gated by major.
2. `ReactRefreshPlugin.deprecated_runtimePaths` (used in `DevelopmentPlugin`) — removed in
   `@rspack/plugin-react-refresh@2`. **The only true hard crash** (throws at module load).
   Strategy decided in doc 06.
3. Persistent cache config moved `experiments.cache` → top-level `cache`. *Verified: the
   v1-style key is silently inert under v2* — users lose persistent caching with no
   signal, and `--reset-cache` misdetects; the TS type Re.Pack derives from
   `experiments.cache` is also gone from v2 types.

**Biggest structural consideration:** `@rspack/core@2` is pure ESM and requires
Node `^20.19.0 || >=22.12.0`. Re.Pack's published CJS (`require('@rspack/core')`) keeps
working via Node's `require(esm)` — but only on those Node versions, which makes the Node
floor the real constraint, not the module format.

**Biggest user-facing risk:** Rspack 2 changed `module.parser.javascript.exportsPresence`
default from `'warn'` to `'error'` — the React Native ecosystem is full of packages with
technically-invalid imports that Metro tolerates. We likely want Re.Pack to default this
back to a lenient value (see [04](./04-questions-and-blockers.md)).

## Key external references

- Planned breaking changes discussion: https://github.com/web-infra-dev/rspack/discussions/9270
- Announcement blog post: https://rspack.rs/blog/announcing-2-0
- Official migration guide: https://rspack.rs/guide/migration/rspack_1.x
- Rspack 2.0 stable released ~2026-04-22; latest at time of writing: `@rspack/core@2.1.2`
- Rspack 1.x line frozen at `1.7.12` (critical fixes only, new features go to 2.x)
