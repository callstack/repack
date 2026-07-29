# Dual Rspack 1.x/2.x Support — Technical Design

A single `@callstack/repack` release supports both `@rspack/core` majors.
The source **compiles against Rspack 2 types** and **runs against both
majors**, branching at runtime on the installed major. Behavior for
Rspack 1 and webpack users is unchanged.

## Version detection

`src/helpers/rspackVersion.ts` resolves `@rspack/core/package.json` instead
of importing the package:

- `@rspack/core@2` is pure ESM — a CJS `require('@rspack/core')` throws
  `ERR_REQUIRE_ESM` on Node < 20.19, so detection must not load the package;
- `@rspack/core` is an optional peer dependency and may be absent entirely
  (webpack-only projects).

`getRspackVersion` / `getRspackMajorVersion` / `isRspack2` take an optional
project-context directory for resolution. `getRspackMajorVersionFromCompiler`
serves plugin contexts via `compiler.webpack.rspackVersion` (returns `null`
for webpack compilers).

`@rspack/core` is otherwise loaded with a plain `import` — the published
package carries no workspace- or monorepo-aware resolution logic.

## Node compatibility

Rspack 2 requires Node `^20.19.0 || >=22.12.0`; Re.Pack's `engines` stays
`>=18` because Rspack 1 and webpack setups are unaffected. Instead of a hard
floor, `commands/rspack/ensureNodeCompat.ts` raises a clear error when
Rspack 2 is detected on an unsupported Node. The rspack commands are
lazy-loaded inside the command handlers so the guard runs before anything
touches `@rspack/core`.

Re.Pack's compiled CJS keeps working against the ESM-only core on supported
Node versions via `require(esm)`: Rspack 2 uses the `module.exports`
ESM-interop convention, so CJS consumers receive the callable `rspack`
function with all named exports attached (`core.rspack === core`) — a shape
identical to v1.

## Config generation

- `experiments.parallelLoader` is emitted only under Rspack 1. Rspack 2
  removed the global flag (parallel loading is stable and opt-in per rule
  via `use[].parallel`), so the loader's parallel-mode warning probe is
  also skipped under v2 — running non-parallel there is a valid choice,
  not a misconfiguration.
- `module.parser.javascript.exportsPresence` is set to `'auto'` under
  Rspack 2. The upstream default changed from `'warn'` to `'error'`, which
  breaks builds on technically-invalid imports inside `node_modules` — a
  common occurrence in the React Native ecosystem that Metro tolerates.
  Users can override this in their project config.

## Persistent cache

Rspack 2 moved the persistent cache configuration from `experiments.cache`
to top-level `cache` (same shape) and **silently ignores** the legacy key.

- `getRspackCacheConfigs` collects the cache configuration from **both**
  locations, so `--reset-cache` clears every candidate directory regardless
  of which major the config was written for (with both keys set, the wrong
  cache would otherwise survive a reset under v2).
- Under Rspack 2 with `experiments.cache` set, `warnLegacyRspackCacheConfig`
  emits a one-time warning pointing at the top-level option — unless the
  same config already sets a top-level persistent cache (then the leftover
  legacy key is inert and no warning fires). The config is left untouched —
  migration is the user's action.

## React Refresh

`DevelopmentPlugin` branches on the compiler's major:

- **Rspack ≥ 2**: applies the official `@rspack/plugin-react-refresh@^2`
  (an optional peer dependency — installed by v2 users alongside
  `@rspack/core@2`) with `injectEntry: false`, `forceEnable: true`, and
  `reactRefreshLoader: '@callstack/repack/react-refresh-loader'`. The
  package is ESM-only with a named export, so it is loaded lazily inside
  the version branch.
- **Rspack 1 and webpack**: manual wiring against client runtime files
  vendored at `packages/repack/vendor/react-refresh/` (adapted from
  upstream plugin v2.0.2, MIT, with a LICENSE/provenance file). The
  `vendor/` directory ships as-is via `package.json#files` and is excluded
  from linting and the babel build. The refresh loader rule excludes the
  vendored runtime files themselves (mirroring the official plugin's
  self-exclusion) so they are never re-processed in symlinked-workspace
  layouts. There is no dependency on `@rspack/plugin-react-refresh@1`.

## Tracing / profiling

Published Rspack 2 binaries do not include the perfetto trace layer, so
`--trace-*` profiling defaults to the `'logger'` layer under v2
(`commands/rspack/profile/profile-2.ts`); Rspack 1 behavior is unchanged.

## Module Federation v1

No changes required. Rspack's delegated `ModuleFederationPluginV1` does not
use `@module-federation/runtime-tools` under either major - only the
enhanced MF 1.5 plugin (`container.ModuleFederationPlugin`) resolves it,
and that plugin raises its own actionable install error. (An earlier
revision of this design added a resolvability pre-check to
`ModuleFederationPluginV1.apply`; it was dropped after verification -
see the evidence on PR #1400.)

## Types

The `@rspack/core` devDependency is `^2`, so type-only imports check against
v2 while the runtime object may be either major. Notable v2 type
accommodations:

- `SwcLoaderOptions` became a union discriminated on `detectSyntax`, which
  cannot be spread-and-reassembled; internal helpers operate on a local
  non-union `SwcConfig` alias (Re.Pack never sets `detectSyntax`).
- `builtin:swc-loader`-only options (`rspackExperiments`, `transformImport`,
  `collectTypeScriptInfo`, `detectSyntax`) are split off before calling the
  raw SWC `transformSync` API.
- One documented cast in `commands/rspack/start.ts`: Re.Pack's `devServer`
  type augmentation and Rspack 2's bundled `DevServer` type are structurally
  incompatible solely because each pulls `proxy` types from a different copy
  of http-proxy-middleware. `bundle.ts` avoids the cast by destructuring
  `devServer` off (unused when bundling).

## Testing

- **Unit tests run under both majors.** Jest's sandboxed CJS runtime cannot
  load the ESM-only v2 core, so a custom test environment
  (`jest.environment.js`) loads it outside the sandbox and a
  `moduleNameMapper` bridge exposes it to suites. The environment is
  parameterized on `RSPACK_MAJOR`: v2 via `await import('@rspack/core')`,
  v1 via `require` of the aliased `@rspack/core-v1` devDependency.
  `pnpm test:rspack1` runs the v1 lane; a lane-guard test asserts the loaded
  major matches the requested one.
- **Built-dist smoke suite** (`tests/rspack-compat`) asserts the behavior
  matrix above against the packed dist under both majors — the failure modes
  specific to this design (require(esm) interop, loader resolution, refresh
  runtime source selection) only reproduce against the built output in a
  real project layout.
- **Tester apps**: `apps/tester-app` runs Rspack 2 (full feature surface).
  `apps/tester-app-rspack1` is a standalone app *outside* the pnpm
  workspace with Re.Pack installed from a packed tarball — required because
  in-workspace apps always resolve Re.Pack's own `@rspack/core` devDependency
  (v2) regardless of their manifest pin, and the published package
  deliberately carries no workspace-aware resolution.
- **CI**: the unit suite runs under both majors on Linux and Windows (the
  require(esm) loading path and version-helper filesystem resolution are
  Windows-sensitive); Node 18/20 lanes run the Rspack 1 lane only, per the
  v2 Node floor.
