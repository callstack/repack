# rspack-compat

Built-dist smoke tests for `@callstack/repack` against both supported
`@rspack/core` majors (1.x and 2.x).

Unit tests exercise sources through the Jest/Babel pipeline; the failure
modes this suite covers — `require(esm)` interop, loader resolution, React
Refresh runtime source selection — only reproduce against the **built dist**
installed in a real project layout. The runner therefore always builds
`packages/repack`, packs it into a tarball, installs the tarball into each
fixture, and runs the assertions there.

## Running

```sh
pnpm --filter rspack-compat-test test:smoke      # both fixtures
pnpm --filter rspack-compat-test test:smoke rspack-2   # a single fixture
```

The suite performs network installs and full repack builds, so it is
deliberately **not** part of the default `test` pipeline — CI runs it in a
dedicated lane.

## What is asserted (per major)

1. `getRepackConfig` routing — `experiments.parallelLoader` kept under
   Rspack 1 / dropped under Rspack 2; `exportsPresence: 'auto'` parser
   override under Rspack 2 only.
2. Legacy `experiments.cache` handling — warns exactly once under the
   warn-only policy, never mutates the config, and the cache accessor reads
   the legacy location.
3. `ensureNodeSupportsRspack` passes on a supported Node version.
4. A full dev build through `DevelopmentPlugin` — HMR client and React
   Refresh wiring present in the bundle, with the refresh runtime coming
   from the correct source per major: the vendored client files
   (`packages/repack/vendor/react-refresh/`) under Rspack 1 with zero
   official-plugin references, the official `@rspack/plugin-react-refresh`
   under Rspack 2 with zero vendored references.

## Why the fixtures are standalone (tarball install)

Inside the pnpm workspace, repack is linked as a symlink, so its own
`@rspack/core@^2` devDependency shadows any fixture's v1 pin — bare
`import '@rspack/core'` from `packages/repack/dist` resolves repack's copy
before the project's. An in-workspace v1 fixture would therefore silently
test v2 twice. Published installs don't have this problem (`@rspack/core`
is a peer dependency there), and shipped code deliberately carries no
monorepo-aware resolution workarounds, so the fixtures replicate the
published layout instead: each one is its own pnpm workspace root
(`pnpm-workspace.yaml` with `packages: []`) with its own `node_modules`,
installing repack from a packed tarball — the same pattern as
`apps/tester-app-rspack1`.

`smoke.cjs` enforces this as a **lane guard** before running any behavior
assertions: the fixture's installed `@rspack/core` major must match the
major declared in its manifest, the `@rspack/core` that *repack itself*
resolves must be that same copy, and the resolved repack package must live
inside the fixture's `node_modules` (never a workspace link back to
`packages/repack`). Any violation aborts the run with a non-zero exit.

`react-native` is stubbed (`fixtures/shared/rn-stub`) with just the modules
Re.Pack's development runtime imports — real RN sources need the full
flow/babel loader chain, which is out of scope for wiring-level smoke tests.

See `agent_context/rspackv2-jul2026/design.md` for the overall dual-major
support design.
