# Performance Regression Guards — Technical Design

A change can be benchmarked against its base for bundle size, build time and
peak memory, so changes (including AI-generated ones) don't silently regress
performance. It runs locally (`pnpm bench --base-ref origin/main`) or as an
on-demand CI check that is independent of the regular CI checks
(`.github/workflows/perf.yml`, triggered by a `perf` PR label or manually).
Whether it should eventually run on every PR depends on how fast it turns out
to be in CI. Implementation: `tests/perf/`. Usage is in `tests/perf/README.md`.

## Prior art (surveyed Oct 2026)

- **No React Native bundler gates on performance publicly.** Metro, Expo CLI,
  rnx-kit and the Vite-for-RN efforts have no perf CI.
- **webpack** (closest to Re.Pack: JS plugins/loaders) runs tinybench +
  CodSpeed walltime and memory modes on PRs
  (`.github/workflows/benchmarks.yml`), deterministic V8 flags, and a separate
  output-size job comparing against a main baseline artifact (`code-size.yml`).
- **Rspack** uses CodSpeed simulation for Rust micro-benchmarks, plus an
  ecosystem benchmark (`web-infra-dev/rspack-ecosystem-benchmark`) on a
  dedicated runner that flags ≥5% time and ≥30% memory (RSS is noisy), and a
  binary `size-limit` check.
- **Rolldown, Turbopack, Next.js, Parcel**: CodSpeed or
  `github-action-benchmark` with loose thresholds (e.g. 110%), PR comments, and
  rarely failing checks — except on size.

The common pattern, adopted here: **hard-fail on deterministic metrics (size),
use loose thresholds with noise controls for time and memory.**

## Design

- **Fixtures** are real apps (`apps/tester-app` with rspack and webpack, ios
  and android) bundled through the public `bundle` command, so loaders
  (`babel-swc-loader`, assets), `RepackPlugin` and the NativeWind/Reanimated
  plugins are all exercised. Defined in `tests/perf/src/config.mjs`.
- **Same-job A/B**: base and head are built and measured on the same machine,
  with runs interleaved and order alternated. No stored baselines, no external
  service, so it works for fork PRs and locally (`--base-ref`).
- **Process isolation**: each build runs in a fresh process
  (`build-once.mjs`) that resolves `@callstack/repack` from the measured
  checkout, so one harness can drive any checkout.
- **Memory**: `process.resourceUsage().maxRSS` (exact, includes threads) plus a
  `ps`-sampled process-tree peak for webpack's worker processes.
- **Classification** (`report.mjs`): size metrics fail at >1% (warn on any
  change); sampled metrics fail only when the median change exceeds the
  threshold *and* head/base samples don't overlap. Memory also has an absolute
  `failDelta` because Rspack's multi-GB peak hides large leaks in relative terms.

## Pitfalls found while building it

- **Checkout location matters.** A base worktree under `node_modules/` made
  `babel-swc-loader` treat app code as third-party (`/node_modules/` checks),
  changing output and slowing webpack builds ~60%. A symlinked root (macOS
  `/var` → `/private/var`) made asset and chunk names absolute. Base worktrees
  live in `realpath(os.tmpdir())`; CI checks out `head/` and `base/` side by
  side.
- **Source maps embed absolute paths**, so their size depends on checkout path
  length; the repo root is replaced before measuring.
- **webpack output is nondeterministic** with `thread-loader` +
  `babel-swc-loader`: the same React Native files get different
  `@babel/runtime` helpers (e.g. `classPrivateFieldLoose*` vs `readOnlyError`)
  depending on the worker, changing module counts and bundle bytes by a few
  KB per run. The harness detects per-metric variation across runs and falls
  back to sampled comparison for those metrics. Rspack output is
  byte-identical across runs and checkouts.
- **Rspack peak RSS is ~4.5 GB** for tester-app on a 14-core machine (webpack:
  ~1.2 GB main process), most likely from parallel loader workers scaling with
  CPU count.

## Not covered yet

- Dev server startup, rebuild latency and development-mode bundles.
- Module Federation testers.
- Instruction-count benchmarks (CodSpeed simulation) for low-noise timing of
  JS hot paths; needs CodSpeed set up for the org.
- PR comments (the report is in the job summary; comments from fork PRs need a
  `workflow_run` follow-up job).
