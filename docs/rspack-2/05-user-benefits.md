# What Rspack 2.0 Brings to Re.Pack Users

Sourced from the [Rspack 2.0 announcement](https://rspack.rs/blog/announcing-2-0) and the
[migration guide](https://rspack.rs/guide/migration/rspack_1.x), filtered to what actually
matters for React Native + Re.Pack workflows.

## Build performance

- **~10% faster builds vs 1.7, up to 2× vs 1.0**, and **>20% lower memory usage** —
  directly felt in `repack start`/`repack bundle` on large RN apps.
- **Persistent cache is now stable** (top-level `cache` option, was
  `experiments.cache`). Upstream benchmark: cached prod build 2.2s → 1.4s. For RN teams
  this shortens the cold-start after `pnpm install`/branch switches. Re.Pack's
  `--reset-cache` already integrates with it.
- **SWC minimizer ~50% faster on cache hits** — a candidate to replace Terser as Re.Pack's
  default Rspack minimizer (pending Hermes output-parity validation), which would cut the
  dominant cost of release builds.
- **`lazyCompilation` stable** — faster dev-server startup for large multi-entry setups.

## Bundle size / output quality (bigger deal on mobile than web)

- **Smarter tree shaking**: CommonJS destructuring analysis, property-access analysis,
  smarter dynamic imports — RN dependency trees are full of CJS interop, so this should
  translate into real bundle-size wins (faster app startup, smaller OTA payloads).
- **`/*#__NO_SIDE_EFFECTS__*/` and `optimization.inlineExports`** — more dead code
  eliminated across module boundaries.
- **Module Federation shared-dependency tree shaking** (`treeShaking` config) — notable for
  Re.Pack's super-app/MF audience where shared `react-native` deps dominate remote sizes.
- **`optimization.moduleIds: 'hashed'`** — stable short module IDs across builds; useful
  for ScriptManager-based chunk caching and OTA diffing, where ID churn currently
  invalidates chunks unnecessarily.
- **`enforceSizeThreshold` in splitChunks (50KB prod default)** — better automatic chunk
  granularity for remote-loaded code.

## Dependency & install footprint

- `@rspack/core` went from 8 npm dependencies to 1 — leaner `node_modules`, fewer
  transitive-dep audit findings, faster CI installs.
- `@module-federation/runtime-tools` no longer force-installed for non-MF users.

## DX & correctness

- **Config validation on by default** — typos in `rspack.config.*` fail fast instead of
  being silently ignored.
- **Top-level `target` propagates to SWC/LightningCSS/minimizers** — one place to declare
  the syntax floor instead of three (Re.Pack still pins RN-appropriate loader options, but
  user overrides get simpler).
- **`detectSyntax: 'auto'` for swc-loader**, subpath `#` imports from `package.json`
  `imports` working without extra config, `import.meta.dirname/filename` support.
- **Better agent/debugging tooling direction** upstream (Rsdoctor integration, richer
  tracing) — aligns with Re.Pack's `--trace-*` profiling flow.

## Strategic

- **Rspack 1.x is in maintenance mode** (critical fixes only, frozen at 1.7.12). New
  features — including RN-relevant output optimizations — land in 2.x only. Supporting 2.x
  keeps Re.Pack users on the maintained line and keeps Re.Pack attractive vs Metro on
  build-performance grounds.
- Experimental **React Server Components support** upstream — not an RN feature today, but
  relevant to where the React ecosystem is heading.
- Ecosystem momentum: Rspack downloads grew 100k → 5M/week; Next.js, Nuxt, Angular,
  Storybook support it — more shared knowledge and third-party plugin compatibility.
