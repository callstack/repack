# Rspack 2.0 Support — Research & Planning

> Status: **Research complete — all decisions made (Q1–Q5 in doc 04, React Refresh in
> doc 06). Ready for implementation.**
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

## TL;DR

Dual support (Rspack 1 + 2) is **feasible with a moderate amount of work**. Re.Pack is in
good shape because it configures almost everything explicitly rather than relying on
Rspack defaults, and it already has a version-branching precedent
(`packages/repack/src/commands/rspack/profile/index.ts`).

**Only 3 confirmed hard breaks in Re.Pack code:**

1. `experiments: { parallelLoader: true }` injected by `getRepackConfig` — the option was
   **removed** in Rspack 2 and config validation is on by default → immediate validation
   error on every Rspack 2 build.
2. `ReactRefreshPlugin.deprecated_runtimePaths` (used in `DevelopmentPlugin`) — removed in
   `@rspack/plugin-react-refresh@2`. Mitigated today by the pinned `1.0.0` dependency, but
   needs a deliberate strategy.
3. Persistent cache config moved `experiments.cache` → top-level `cache` — Re.Pack reads
   `config.experiments?.cache` in `start`/`bundle` for `--reset-cache`, and the TS type it
   derives from `experiments.cache` no longer exists in v2 types.

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
