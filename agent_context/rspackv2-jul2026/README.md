# Rspack 2.0 Support — Research & Planning

> Status: **Implemented on this branch** — core dual-version support (plan phases 0–2)
> is in `packages/repack`; all decisions recorded (Q1–Q5 in doc 04, React Refresh in
> doc 06), V1–V11 verification executed with no blockers (doc 07).
> Remaining follow-ups: CI matrix + tester-app/metro-compat validation under v2 (phase 3)
> and flipping init/templates/website defaults to v2 (phase 4).
> Branch: `feat/rspack-2-support`
> Last updated: 2026-07-02

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
