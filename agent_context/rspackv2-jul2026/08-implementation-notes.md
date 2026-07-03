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
| `9075eb20` | docs: external sources cited |
| *(working tree)* | **2026-07-02/03, not yet committed:** the post-feedback reworks — warn-only cache, vendor-directory move, per-major tester apps (tester-app → v2 example, standalone tester-app-rspack1), `loadRspack` implemented-then-reverted — see § Reference branch updates below. The sections above describe the branch as of `d0ea05d6`/`ba841a6a`; where they conflict, § Reference branch updates wins. |

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
   `warnLegacyRspackCacheConfig` (called from `start`/`bundle` when
   `isRspack2`) emits a one-time warning and leaves the config untouched —
   because v2 *silently ignores* the legacy key (verified in doc 07).
   (Originally implemented as `migrateLegacyRspackCacheConfig`, which
   auto-copied the value; reworked to warn-only per maintainer feedback #5 —
   doc 10 §5.)
5. **React Refresh** — per the doc 06 decision: `@rspack/plugin-react-refresh@1.0.0`
   dependency deleted; v2 plugin added as **optional peerDependency** (`^2.0.0`);
   `DevelopmentPlugin` splits on major — rspack≥2 applies the official plugin
   (`injectEntry: false`, `forceEnable: true`,
   `reactRefreshLoader: '@callstack/repack/react-refresh-loader'`, lazily
   `require`d inside the branch since the package is ESM-only), webpack +
   rspack 1 use the manual wiring pointed at client files **vendored** into
   the package-root `vendor/react-refresh/` (adapted from plugin v2.0.2,
   MIT, with a LICENSE/provenance file; defines swap the removed overlay
   flags for `__reload_on_runtime_errors__: false`). (Originally vendored
   into `src/modules/reactRefresh/`; relocated per maintainer feedback #2 —
   doc 10 §2.)
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
- **Smoke tests of the built dist** in isolated projects (Node 26); the
  script and lab setup are preserved in
  [appendix-smoke-harness/](./appendix-smoke-harness/README.md):
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
- NOT yet verified (phase 3): metro-compat / resolver-cases suites under v2,
  CI matrix. (Tester apps + device HMR were manually verified 2026-07-03 —
  see § On-device validation below.)

## Reference branch updates (2026-07-02, post-feedback)

The maintainer-feedback reworks planned in [doc 09](./09-pr-split-plan.md) /
[doc 10](./10-maintainer-feedback-evaluation.md) were applied directly to
`feat/rspack-2-support` (so porting into the stack PRs is a cherry-pick, not
a rework), plus one new discovery made while validating them:

### Applied reworks

- **Warn-only cache** (feedback #5, PR 4 material):
  `commands/common/migrateLegacyRspackCacheConfig.ts` →
  `warnLegacyRspackCacheConfig.ts`; warns once, mutates nothing; call sites
  in `start.ts`/`bundle.ts` updated. Runtime-verified against the built dist
  (warns exactly once, config untouched, accessor still reads the legacy
  location).
- **Vendor directory** (feedback #2, PR 6 material):
  `src/modules/reactRefresh/` → package-root `vendor/react-refresh/` with an
  upstream LICENSE/provenance file (files are verbatim upstream v2.0.2 client
  files apart from headers/formatting — diffed to confirm). Shipped as-is via
  `package.json#files` (`"vendor"`); excluded from biome
  (`packages/repack/vendor/**`); outside the babel `src → dist` build by
  construction. The `require.resolve('../../vendor/react-refresh/*')` paths
  resolve identically from `src/plugins` and `dist/plugins`.
- **PR 8 apps** (restructured 2026-07-03, maintainer decision):
  **`tester-app` is the Rspack 2 example** — its manifest moved to the new
  `rspack2` named catalog (`@rspack/core@^2.1.2`, `@swc/helpers@^0.5.23`)
  plus `@rspack/plugin-react-refresh: catalog:rspack2` and a direct
  `react-refresh@^0.18.0`; **`apps/tester-app-rspack1`** is the special
  case (standalone v1, § Discovery below). An interim
  `apps/tester-app-rspack2` shared-src mirror (built + device-verified
  2026-07-02/03) was removed in the restructure: in-workspace, tester-app
  already runs v2, so a nominally-v1 tester-app plus a v2 mirror was one
  app too many and the wrong one labeled.

### Discovery: repack's devDep shadows the project's rspack in-workspace

First smoke run of the two tester apps showed **both** compiling with Rspack
2.1.2 — including `tester-app`, whose manifest pins `@rspack/core@^1.6.0`.
Cause: `Compiler.ts`/`bundle.ts`/`profile-*.ts` do a bare
`import { rspack } from '@rspack/core'`, which from `packages/repack/dist`
resolves repack's **own devDependency** (v2, added for types/tests) before
the app's copy — because workspace apps link repack as a symlink, so
resolution walks up from `packages/repack`. Published packages are
unaffected (`@rspack/core` is only a peer there; tarball installs have no
nested `node_modules`), but in-workspace no app manifest can pin Rspack 1.

**Decision (Daniel, 2026-07-03): do NOT work around this in shipped code.**
A first fix (`helpers/loadRspack.ts`, resolving `@rspack/core` from the
project root and threading context through the commands) was implemented,
verified, and then **reverted** — it let monorepo layout details leak into
the published package. The shipped code keeps plain `import '@rspack/core'`;
the consequence is accepted and solved at the fixture level instead:

- **In-workspace apps always run repack's devDep major (currently v2).**
  A v1 pin in a workspace app manifest would affect only that app's own
  types/`node_modules`, not what the CLI loads — which is why `tester-app`
  was moved to the `rspack2` catalog (its manifest now matches what runs)
  and no workspace app claims to be a v1 surface.
- **The Rspack 1 validation surface is `apps/tester-app-rspack1`** — a
  standalone app *outside* the pnpm workspace (negation glob in the root
  `pnpm-workspace.yaml` + its own `pnpm-workspace.yaml` marking a separate
  workspace root), with its own `node_modules` and repack installed from a
  **packed tarball** (`pnpm run pack-repack` → `file:./callstack-repack.tgz`)
  so resolution behaves exactly like a real user project. Minimal own src
  (async local chunk + HMR target; not shared with tester-app — sharing src
  across the workspace boundary would load two copies of react). See its
  README.
- The dual-major **unit** lane (`pnpm test:rspack1`) is unaffected — the
  Jest environment explicitly loads the aliased `@rspack/core-v1`.

### Correction (2026-07-03): the dual-major unit lane didn't exist until now

Earlier notes in this doc claimed "280/280 under both majors" via
`RSPACK_MAJOR=1 pnpm test`. **That claim was wrong**: `jest.environment.js`
unconditionally imported `@rspack/core` (v2) and no `@rspack/core-v1` alias
or `test:rspack1` script existed — the env var was silently ignored, so both
runs tested v2. (Caught by an external review of the docs, 2026-07-03.)

The lane described in doc 09 (PR 2 § testing) is now **implemented on the
reference branch**: aliased devDep `"@rspack/core-v1": "npm:@rspack/core@^1.7.12"`,
`jest.environment.js` parameterized on `RSPACK_MAJOR` (v1 via plain
`require` — CJS, outside the sandbox; v2 via `await import`), exposed
`__RSPACK_MAJOR__` global, and `"test:rspack1": "cross-env RSPACK_MAJOR=1 jest"`
(cross-env for Windows shells, per the doc 09 note). A permanent guard test
(`src/__tests__/rspackTestLane.test.ts`) asserts the loaded core's major
matches the requested lane, so a silently-unwired lane can't pass again.
Verified for real: **281/281 under v2 and under v1 (1.7.12)** — including
the plugin suites that run actual compilations (OutputPlugin, CodeSigning,
MFv2). No test needed `__RSPACK_MAJOR__` gating yet: the suite's
version-detection paths resolve repack's own devDep (v2) in-workspace either
way (see § Discovery), so the v1 lane's coverage is the real v1 **core
object/compilation surface**, not version-routing logic.

### Verification (2026-07-02/03, after the revert where relevant)

- `pnpm build` / `typecheck` / biome clean; `pnpm test` and
  `pnpm test:rspack1`: **281/281 under both majors** — see the correction
  below on when the v1 lane became real.
- `tester-app-rspack1` (standalone, tarball install): `bundle:android` and
  `bundle:ios` print "(Rspack **1.7.12**) compiled successfully"; dev bundle
  contains the **vendored** refresh runtime and zero official-plugin refs.
- `tester-app` (now manifested on the `rspack2` catalog): `bundle:android`
  / `bundle:ios` → "(Rspack **2.1.2**) compiled successfully" incl.
  local/remote chunks + assets; dev bundle contains the **official
  plugin's** refresh runtime and zero vendored refs; its vitest suite
  passes (12/12).
- Appendix smoke-harness assertions updated to warn-only (2b) and the new
  vendored path (4b).

## On-device validation (2026-07-03, agent-device)

Run on real targets — Android: **Pixel 7 (physical device)**; iOS:
**iPhone 17 simulator**. Final state after the 2026-07-03 restructure
(tester-app = v2 example, standalone tester-app-rspack1 = v1 lane); all with
clean shipped code (post-`loadRspack`-revert):

- **`tester-app` (Rspack 2.1.2, official refresh plugin), both platforms**,
  including the interactive flows (not just passive rendering):
  - all six sections render; async local chunk auto-loads;
  - **Remote chunks**: "Prefetch chunk" → button flips to "Prefetched",
    "Load chunk" → "Remote: this text comes from remote chunk";
  - **Mini-apps**: Install (chunk fetch) → Show → "MiniApp: this text comes
    from MiniApp" + its embedded PNG renders → Hide/Remove
    (`invalidateScripts`) re-enables Install;
  - **Assets test incl. the remote asset**: with
    `pnpm serve-remote-assets:<platform>` running (http-server :9999 over
    `build/output/<platform>/remote`, populated by `bundle:<platform>`;
    plus `adb reverse tcp:9999 tcp:9999` on Android), all three frames
    (local / inline / remote) render — the :9999 access log shows the
    device fetching `remote-assets/.../webpack@3x.png`. **Without that
    server the remote frame is blank** — that is environment setup, not a
    Re.Pack regression;
  - live React Refresh edit+revert; Reanimated + NativeWind sections render.
- **`tester-app-rspack1` (standalone, Rspack 1.7.12, vendored refresh
  runtime), both platforms**: boot, async local chunk auto-loads, live
  React Refresh edit+revert.

Notes: the only in-app console warning anywhere was RN's own `SafeAreaView`
deprecation (pre-existing, unrelated). The removed interim
`tester-app-rspack2` mirror had also passed the same checks minus the
button-driven flows before its removal.

Practical notes for re-running (also apply to CI/e2e follow-up):
- RNTA's gradle **requires** a `resources` section in `app.json` (crashes
  with `containsKey() on null` without one) — chunk filenames in it are
  path-derived, so apps with different roots get different names (e.g.
  `tester-app-rspack1` uses `src_Async_local_tsx.chunk.bundle`).
- The RN CLI's wrapped `pod install` step is flaky when the `resources`
  files don't exist yet; `pnpm bundle:ios` once (or manual
  `bundle exec pod install`) unblocks it. `RBENV_VERSION` may need overriding
  (tester-app pins `.ruby-version` 2.7.6, which isn't installed) and
  CocoaPods needs a UTF-8 locale in non-interactive shells.
- Android: the app's main bundle comes from device `localhost:8081`
  (`adb reverse tcp:8081 tcp:<server port>`); chunks use the
  `__PUBLIC_PORT__` baked into the bundle (repack auto-reverses that port).
  iOS simulator: `xcrun simctl spawn booted defaults write <bundle id>
  RCT_jsLocation "127.0.0.1:<port>"` before relaunch.
- `tester-app-rspack1` setup: `pnpm run pack-repack && pnpm install` in the
  app dir (re-run both after changing `packages/repack` — the tarball is a
  snapshot). Its copied Android shell needed tester-app's
  async-storage-specific maven block removed from `build.gradle`.

## Catalog flip: workspace default is Rspack 2 (2026-07-03)

Decided with the maintainer after the per-major tester-app restructure. The
default pnpm catalog previously pinned `@rspack/core: ^1.6.0`, but those v1
pins were cosmetic for anything compiled through repack: every workspace
consumer already ran 2.1.2 via repack's devDep (§ Discovery above). The
workspace now says what it runs:

- Default catalog: `@rspack/core: ^2.1.2`, `@rspack/plugin-react-refresh:
  ^2.0.2`, `@swc/helpers: ^0.5.23`. The named `rspack2` catalog is deleted;
  `tester-app` pins plain `catalog:` again (no longer the odd one out), and
  both federation apps declare the refresh plugin like any real v2 app.
- The Rspack 1 surfaces are unchanged and explicit: the standalone
  `apps/tester-app-rspack1` lab and the `pnpm test:rspack1` jest lane.

### Findings: first true-v2 run of tests/integration's rspack lane

`tests/integration` imported `@rspack/core` directly (not through repack),
so its rspack lane was the one workspace surface genuinely on v1 until the
flip. Running it on 2.1.2 surfaced three **output-format** changes (no
behavioral regressions — useful for anyone post-processing bundles):

1. **Custom runtime-module banners** lost the `webpack/runtime/` prefix:
   `// webpack/runtime/repack/polyfills` (v1/webpack) is `// repack/polyfills`
   under v2. Built-in and MF-plugin runtime modules keep the prefix
   (`// webpack/runtime/embed_federation_runtime`).
2. **Unminified module factories** use shorthand method syntax under v2
   (`721() { ... },`) instead of `721: (function (...) { ... }),`.
3. **Runtime-module order vs MFv2's `embed_federation_runtime` flipped**:
   polyfills now precede the embed wrapper in the runtime section. The
   invariant Re.Pack cares about — polyfills execute before
   `__webpack_require__.x()` is invoked — holds under both majors (verified
   by inspecting the emitted bundle end-to-end).

Test-side fixes in `NativeEntryPlugin.test.ts`: version-agnostic
`repack/polyfills` marker, an added Rspack-2 module-factory regex in
`extractModuleIdByMarker`, the MFv2 order assertion reduced to the real
invariant, and rspack-lane snapshots regenerated under 2.1.2 (webpack-lane
snapshots changed only by the marker offset). All 58 tests pass in both
lanes; the semantic assertions (polyfill/startup ordering, runtime require
ids aligned with production module ids) now genuinely verify v2.

### Revalidation after the flip (2026-07-03)

Full sweep, all green: build/typecheck/lint; `turbo run typecheck test
--force` (17/17 incl. integration, metro-compat, resolver-cases, tester-app
bundle tests on 2.1.2 + webpack); `test:rspack1` 281/281;
`tester-federation` host+mini bundles on both platforms under Rspack 2.1.2
and the `USE_WEBPACK` lane; `tester-federation-v2` host+mini bundles on both
platforms (container + `mf-manifest.json` emitted) plus a dev-server smoke
(host bundle, mini container, and manifest all served 200). The standalone
lab is outside the workspace and unaffected by catalogs; it was validated
the same day (release bundles on 1.7.12, dev bundle served with the
vendored refresh runtime).
