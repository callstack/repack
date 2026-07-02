# Implementation Notes

What was actually built on `feat/rspack-2-support`, including the non-obvious
technical details discovered during implementation that aren't captured in the
research docs (01–07). Written so a fresh context can pick up the work without
the original conversation.

## Commits on this branch

| Commit | Contents |
| --- | --- |
| `914d3053` | Research docs (01–05 + README) |
| `8d741365` | React Refresh deep dive (doc 06) |
| `7d8687f8` | Q1–Q5 decisions recorded |
| `0b1a3a5a` | V1–V11 verification results (doc 07) |
| `d0ea05d6` | **feat: support rspack 2 alongside rspack 1** — the core implementation |
| `ba841a6a` | **refactor: replace type casts with proper typing** |
| `f623076f` | docs moved to `agent_context/rspackv2-jul2026/` |
| `2f50d03b` | agent_context lifecycle refinement |

Draft PR for the whole branch: [#1393](https://github.com/callstack/repack/pull/1393)
(to be closed in favor of the PR stack — see doc 09).

## What was implemented (plan phases 0–2)

1. **Version detection** — `packages/repack/src/helpers/rspackVersion.ts`:
   `getRspackVersion` / `getRspackMajorVersion` / `isRspack2` resolve
   `@rspack/core/package.json` instead of importing the package (safe on any
   Node version, safe when not installed); `getRspackMajorVersionFromCompiler`
   reads `compiler.webpack.rspackVersion` for plugin contexts.
   `profile/index.ts` refactored onto it.
2. **Node guard + lazy commands** — `commands/rspack/ensureNodeCompat.ts`
   raises a clear `CLIError` for Rspack 2 on Node < 20.19 (instead of
   `ERR_REQUIRE_ESM`). `commands/rspack/index.ts` now lazy-imports
   `start`/`bundle` inside the command `func`s — the guard runs first, and
   loading `react-native.config.js` no longer touches `@rspack/core` at all.
3. **Config generation** — `getRepackConfig`: `experiments.parallelLoader`
   only under v1; `module.parser.javascript.exportsPresence: 'auto'` under v2
   (decision Q1). `checkParallelModeAvailable` in babelSwcLoader skips its
   probe under v2 (the global flag no longer exists; non-parallel is a valid
   choice there, not a misconfiguration).
4. **Persistent cache** — `getRspackCacheConfig` reads both the v1
   (`experiments.cache`) and v2 (top-level `cache`) locations;
   `migrateLegacyRspackCacheConfig` (called from `start`/`bundle` when
   `isRspack2`) moves a legacy value to `cache` with a one-time warning —
   because v2 *silently ignores* the legacy key (verified in doc 07).
5. **React Refresh** — per the doc 06 decision: `@rspack/plugin-react-refresh@1.0.0`
   dependency deleted; v2 plugin added as **optional peerDependency** (`^2.0.0`);
   `DevelopmentPlugin` splits on major — rspack≥2 applies the official plugin
   (`injectEntry: false`, `forceEnable: true`,
   `reactRefreshLoader: '@callstack/repack/react-refresh-loader'`, lazily
   `require`d inside the branch since the package is ESM-only), webpack +
   rspack 1 use the manual wiring pointed at client files **vendored** into
   `src/modules/reactRefresh/` (adapted from plugin v2.0.2, MIT; defines swap
   the removed overlay flags for `__reload_on_runtime_errors__: false`).
6. **Tracing** — `profile-2.ts` defaults the trace layer to `'logger'` under
   v2 (published v2 binaries lack perfetto, verified V9).
7. **MFv1 pre-check** — `ModuleFederationPluginV1.apply` verifies
   `@module-federation/runtime-tools` is resolvable under rspack≥2 with an
   actionable error (no longer auto-installed by `@rspack/core`).
8. **Types** — `packages/repack` devDeps moved to `@rspack/core@^2.1.2` +
   `@swc/helpers@^0.5.23` (workspace catalog stays `^1.6.0` for everything
   else). `ConfigKeys` gained `cache` and `experiments` (it genuinely
   under-described what the commands read).

## Non-obvious technical details (hard-won, do not rediscover)

### Jest cannot load ESM-only @rspack/core — sandbox escape required
Jest's CJS module runtime cannot `require(esm)`, and **`createRequire` inside
the Jest sandbox is wrapped by Jest** — a bridge module calling
`createRequire(__filename)('@rspack/core')` loops back through
`moduleNameMapper` into itself (observed: the bridge received its own partial
exports). The working escape: a custom test environment
(`jest.environment.js`) — environments load *outside* the sandbox with Node's
real module system — preloads the core via `await import()` and exposes it as
`this.global.__RSPACK_CORE__`; `jest.rspack-core-bridge.js` (mapped via
`moduleNameMapper`) reshapes it with `__esModule: true` so Babel's import
interop keeps named imports working. Result: all suites run against the real
Rspack 2 — 280 tests (previously 234; four suites weren't even loading).

### require(esm) interop shape
`require('@rspack/core')` under v2 returns **the callable `rspack` function
itself** with all named exports attached (`core.rspack === core`) — Rspack
uses Node's `module.exports` ESM-interop convention, so CJS consumers get a
v1-identical shape. No `__esModule` marker, no `default` export. Babel-compiled
named imports work unchanged. (`@rspack/plugin-react-refresh@2` does NOT do
this — it has a **named export only**; a default import yields `undefined`.)

### v2 type fallout patterns
- `SwcLoaderOptions` became a **union discriminated on `detectSyntax`** —
  spread-and-override helpers can't reassemble a union. Fix: local non-union
  `SwcConfig` alias in `loaders/babelSwcLoader/options.ts`
  (`Omit<SwcLoaderOptions, 'jsc' | 'detectSyntax'> & { detectSyntax?: false; jsc?: SwcLoaderJscConfig }`).
- The raw SWC `transformSync` options type doesn't accept
  `builtin:swc-loader`-only keys — `babelSwcLoader` now destructures
  `rspackExperiments`/`transformImport`/`collectTypeScriptInfo`/`detectSyntax`
  off before calling it (also more correct at runtime). `SwcOverrides`
  excludes them too.
- Cache types are derived from source of truth:
  `RspackConfiguration['cache']` + `NonNullable<Configuration['experiments']> & { cache?: ... }`
  (the intersection also defeats TS's weak-type check that plagued
  structurally-typed attempts).
- TS's **weak-type check** rejects all-optional parameter types when an
  argument's union members share no properties — this is why the cache
  migration call lives in `start`/`bundle` (concrete `Configuration[]`), not
  in `makeCompilerConfig` (inferred literal-union from `webpack-merge`).

### Working agreement: no type casts
Maintainer preference (Daniel, 2026-07-02): avoid `as X` and especially
`as unknown as X`. Use `satisfies`, type narrowing, or fix the underlying
mismatch; where genuinely impossible, keep the cast with the full reasoning
in a comment and call it out in review. Current state: **one** irreducible
cast remains, in `commands/rspack/start.ts` — Re.Pack's `devServer` type
augmentation (`src/types/dev-server-options.d.ts`) vs Rspack 2's bundled
`DevServer` type are incompatible solely because each pulls `proxy` types from
a different copy of http-proxy-middleware; `devServer` can't be stripped there
because the dev-server flow reads it back from `compiler.options`. The genuine
fix would be aligning `@callstack/repack-dev-server`'s proxy types with
rspack's bundled ones (possible future work). `bundle.ts` avoids the cast by
rest-destructuring `devServer` off (it's not needed for bundling).

### Misc
- The `devServer` key is *accepted* by v2 at runtime (validation is loose —
  doc 07); the conflict is purely type-level.
- Repack's `type: 'javascript/auto'` on transform rules is what makes its ESM
  `dist/modules/*` files bundle inside a `"type": "commonjs"` package scope —
  a bare config without such a rule parses them as CJS and fails.
- Biome's `useOptionalChain` conflicts with TS narrowing on `false | DevServer`;
  `typeof x === 'object' && x.hot` satisfies both.

## Verification performed

- `pnpm typecheck` / `build` / `test` (280/280) / biome — clean;
  `turbo run build typecheck` green across all 12 workspace tasks.
- **Smoke tests of the built dist** in isolated projects (Node 26), script
  kept in the session scratchpad (`smoke.cjs`, labs `v1-lab`/`v2-lab`):
  - Rspack **1.7.12**: parallelLoader kept, no parser override, cache
    accessor + migration, Node guard, full dev build with HMR + React Refresh
    via the **vendored files** — all PASS.
  - Rspack **2.1.2**: no parallelLoader, `exportsPresence: 'auto'`, cache
    migration, Node guard, full dev build with HMR + React Refresh via the
    **official v2 plugin** — all PASS.
  - Lab setup notes: react-native stubbed via `resolve.alias` (RN sources
    need the full flow/babel loader chain); loader resolved via
    `resolveLoader.alias`; rspack-2 users of the official plugin also need
    `react-refresh` installed (pnpm-strict layouts won't hoist repack's copy
    into the plugin's resolution scope).
- NOT yet verified (phase 3): device HMR e2e, tester apps, metro-compat /
  resolver-cases suites under v2, CI matrix.
