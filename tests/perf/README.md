# Performance benchmarks

Guards against bundle size, build time and memory regressions by bundling the
fixture apps in production mode and comparing the results with another
checkout (normally the PR base).

```sh
pnpm bench                              # measure this checkout only
pnpm bench --base-ref origin/main       # compare with the merge-base of origin/main
pnpm bench --fixtures rspack/ios --runs 3
```

`--base-ref` creates a git worktree of the merge-base under the OS temp
directory (`<tmp>/repack-perf/base-<sha>`), installs it once and reuses it on
later runs. Both checkouts are rebuilt with turbo before measuring (skip with
`--skip-build`). Reports go to `results/report.md` and `results/results.json`.

| Option | Default | |
| --- | --- | --- |
| `--base-ref <ref>` | – | Compare with the merge-base of `HEAD` and `<ref>` |
| `--base <dir>` / `--head <dir>` | – / repo root | Compare two existing checkouts (used in CI) |
| `--runs <n>` | `5` | Timed runs per fixture and checkout, after 1 warmup |
| `--fixtures <a,b>` | all | Substring filter on fixture names |
| `--out <dir>` | `results/` | Output directory |
| `--no-fail` | – | Exit 0 even when a regression is detected |

## What is measured

Each build runs in a fresh Node process (`src/build-once.mjs`), and head and
base runs are interleaved so machine load affects both alike.

- **Output size** (exact): main bundle raw/gzip, all JS chunks gzip, source maps
  (repo path normalized), static assets, plus module and chunk counts and the
  list of emitted files.
- **Build time**: median wall time of the `bundle` command.
- **Peak memory**: `maxRSS` of the build process (covers Rspack's native
  threads and worker threads), and the sampled peak RSS of the whole process
  tree (covers webpack's `thread-loader` and Terser child processes).

Fixtures and thresholds live in `src/config.mjs`:

- Size metrics fail at a >1% increase (5% for maps/assets) and warn on any
  increase.
- Time fails at >15% and memory at >30% or +512 MB, but only when head and base
  samples don't overlap; smaller changes only warn.
- If a checkout produces different output across runs of the same fixture
  (currently the webpack fixtures), its size metrics are marked `¹` and compared
  like timings instead of failing on any change. A PR that makes previously
  stable output nondeterministic gets a warning.

## CI

`.github/workflows/perf.yml` is an on-demand check, separate from the regular CI
checks: it never runs automatically. Trigger it by adding the `perf` label to a
PR (re-add it to run again), or from the Actions tab, optionally with a PR
number. It checks out the base and head side by side, runs 5 interleaved
builds per fixture, and writes the report to the job summary (artifact:
`perf-results`). The run fails on a 🔴 regression, but it is not a required
check.

## Adding a fixture

Add an entry to `FIXTURES` in `src/config.mjs`. The config file must honour
`TEST_WEBPACK_OUTPUT_DIR` for `output.path` (see
`apps/tester-app/__tests__/configs/`). A fixture that doesn't exist in the base
checkout yet is reported for head only.
