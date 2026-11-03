# e2e tests on an emulator

End-to-end tests that run the Re.Pack tester apps on a real emulator or
simulator, so a Re.Pack bundling or runtime bug is caught before merge instead
of inside a consumer app. What the current form optimizes for: a red run means
a real problem rather than a flake. That goal shows up below as concrete rules,
not intentions.

Two lanes, one app each. They share the tooling, the test conventions and the
trigger rule; the rest is per lane.

| Lane | App | Workflow |
| --- | --- | --- |
| [MF2](#mf2-lane) | `apps/tester-federation-v2` | `.github/workflows/e2e.yml` |
| [Expo](#expo-lane) | `apps/tester-expo` | `.github/workflows/e2e-expo.yml` |

Both lanes use ports 8081 and 8082, so they never run on one machine at the
same time.

Tooling: [`tester-army/e2e`](https://e2e.tester.army/docs) with
`@e2e-dev/mobile`, built on
[agent-device](https://github.com/callstack/agent-device). Chosen because
deterministic tests need no model credential, which is what lets a fork PR run
the suite at all. Both packages are pinned exact — pre-1.0, APIs move between
minors. Both are pinned without a caret in the `testers` catalog of
`pnpm-workspace.yaml`, so the app manifest alone does not show the pin.

## Shared by both lanes

### Test conventions

- **Screens report values, tests hold the expectation.** `<Report name="mode"
  value="Inlined" />` renders `mode: Inlined` on one `Text` that carries the
  testID; the test compares it against what the build should have produced.
  Never print `ok`, and never hardcode a label the feature could contradict.
- **No global-counter asserts.** Any background load bumps a global counter, so
  `≥ 1` passes whatever the feature under test does. Counters live only on the
  Runtime Events screen, where they are the subject; elsewhere the proof of a
  load is the loaded content appearing.
- **No branching on app state inside tests.** A loop over a fixed list of named
  rows (the event reports in `runtime-events`) is fine; an `if` on what the app
  currently shows is not — it hides which branch actually ran.
- **Timeouts: defaults first.** Test 120 s, assertion 5 s, `scrollUntilVisible`
  30 s. An extension needs a named physical cause and belongs at the assert — a
  test-level number hides which step stalled. The overrides:
  **30 s on the boot anchor (`home-screen` after `app.open()`) in every file** —
  `app.open()` returns when the window draws, not when the first frame renders;
  after that the app still downloads and evaluates the whole dev bundle, which
  on a cold process takes over 10 s on the CI Android emulator (an emulated
  device sharing a small runner with the dev servers) and only a few seconds on
  the iOS simulator, which runs natively on the host CPU. A test that follows a
  warm run can pass at 5 s, so the default hides the problem until a run starts
  cold; 30 s covers the cold boot at twice the measured worst case. 45 s on
  `miniapp-gallery` in `gallery` and `runtime-events`, and in the Expo lane on
  `expo-widget-ready` and `ordinary-repack-widget-ready` (each file pays the
  manifest + container + chunk chain itself); 30 s on `pipeline: settled` (the
  load chain's own ceiling is `Script.DEFAULT_TIMEOUT`). Note rspack compiles
  the whole graph in one run: lazy chunks are memory files the moment the main
  bundle is served, so chunk asserts are network + execute, never "compile
  waits".
- **testIDs:** `home-<feature>-button`, `<feature>-screen`,
  `<feature>-<thing>-report`, `<feature>-<verb>-button`.
- **Assert app state, never the absence of a warning.**
- **Break each test once and watch it go red.** Say so in the PR. A test nobody
  saw fail proves nothing.

### Triggers

Android gates `pull_request`; iOS runs on `push` to `main` and
`workflow_dispatch`. Plain `pull_request` rather than `pull_request_target`: the
job reads no secrets, needs only `contents: read`, and the default merge-ref
checkout means a PR tests its own workflow file. The gate is GitHub's own fork
approval, which is per push. Triggers skip a run only when every changed file
is `website/**` or `**/*.md` (`paths-ignore`) — never an allow-list of folders
that "can" affect the app: root files like `pnpm-workspace.yaml` (`allowBuilds`),
root `package.json` (`packageManager`), `tsconfig.base.json` and
`.github/actions/setup-pnpm-node` change what the app runs without touching the
lockfile, and an allow-list silently skips them.
Fork runs get a read-only cache token from the platform, so they can restore
`main`'s caches but not poison them.

---

## MF2 lane

### Where things live

| Path | Role |
| --- | --- |
| `apps/tester-federation-v2/e2e/*.e2e.ts` | One file per feature |
| `apps/tester-federation-v2/e2e.config.ts` | Targets, `retries: 0`, `workers: 1` |
| `apps/tester-federation-v2/src/host/FEATURES.ts` | Registry Home renders; one entry = one button. Routes stay hand-listed in `MainNavigator.tsx`; `screen` is typed against them |
| `apps/tester-federation-v2/src/host/ui/` | `Report.tsx` (the one widget screens use to report a value), `ActionButton.tsx` (the button screens share) |
| `apps/tester-federation-v2/src/host/setup.ts` | The chunk resolver; registers the event counters |
| `apps/tester-federation-v2/src/host/features/runtime/events.ts` | The event counters the tests read |
| `.github/workflows/e2e.yml` | Android job (PRs) + iOS job (main, dispatch) |
| `apps/tester-federation-v2/config.expo-host-widget.mts` | Not part of this lane: builds `OrdinaryWidget` (port 8083) for the Expo lane |

`e2e`'s default glob is `tests/**/*.e2e.ts`; this app keeps specs under `e2e/`,
so the config sets `tests` explicitly. Output goes to `.e2e/`, gitignored.

#### Running it locally

No orchestration script by design — the framework and the developer each already
own booting devices and building apps. Three terminals:

```bash
# 1. boot an emulator/simulator first — webpack-start only reverses ports for
#    devices attached at its start
pnpm start:hostapp                              # 8081
pnpm start:miniapp                              # 8082
E2E_DEVICE=<name> pnpm exec e2e run --target ios
```

`e2e run` without `--target` runs both targets; a file path narrows to one test.
Pin `E2E_DEVICE` — unset, the engine takes every booted device of the platform.
Needs Node `^22.22.3 || >=24.8.0` (CI pins 24.22.1). The app must be installed
(`pnpm android` / `pnpm ios`).

**Warm the platform bundle before the first run**, on a fresh server:
`curl 'localhost:8081/index.bundle?platform=android&dev=true&lazy=true&…'` (the
iOS job's shape is in the workflow). A cold first launch compiles before it can
boot, that compile eats the `home-screen` anchor's budget, and the failure looks
like a broken app. This bites locally and in CI equally.

### How the app gets under test

The app is a Debug build that loads its JavaScript from the two dev servers —
host on 8081, MiniApp remote on 8082 — not from an embedded bundle. `app.json`
points `resources.android` at a directory this app never emits, so there is no
fallback bundle. Three consequences are load-bearing:

- **Both servers must answer before the app starts.** react-native-test-app
  chooses its bundle source once at startup and never retries. If 8081 is down,
  Android raises a modal "Unable to find JavaScript bundle" that blocks every
  later tap; iOS silently falls back and keeps going. Both read as a test failure
  that is really an environment failure — the uploaded `.e2e/` artifacts tell
  them apart.
- **Workspace packages build first.** `pnpm --filter tester-federation-v2...
  build` is how a PR's Repack change reaches the servers under test.
- **8082 must be reachable as `localhost` from the device.** The remote URL is
  baked into the bundle as `http://localhost:8082/…` and Repack's
  `__PUBLIC_HOST__` rewrite covers asset public paths and HMR only, never Module
  Federation remote URLs. The device needs `adb reverse tcp:8081 tcp:8082`; locally
  the servers do this at startup, CI does it explicitly.

Re.Pack builds a platform lazily, on that platform's first asset request, so
"`/status` answers" has never meant "bundle is built". That is why the workflow
has an explicit warm step: without it the emulator waits on a cold compile after
a tap.

### What is covered

One file per feature; every test starts from a fresh app process (`app.open()`
restarts the app), so nothing accumulates between tests.

| File | What a red run means | Re.Pack surface |
| --- | --- | --- |
| `gallery` | the MiniApp remote fails to install/load/render | MF2 container load over `localhost:8082` |
| `runtime-events` | the resolve/load chain or the hook chain is broken; one test drives it via Gallery, then reads counters + a computed `pipeline: settled` row | all 6 `ScriptManager` events + the 4 non-owning hooks, counted in `features/runtime/events.ts`; each of the 8 driving rows asserts `≥ 1`, `error: 0` is asserted, and `prefetching`/`error` feed the pipeline row |
| `async-chunk` | a host-owned async chunk no longer loads through `ScriptManager` | `import()` + the allowlist resolver. Not `extraChunks`: `OutputPlugin` is off under a dev server and the resolver's `__DEV__` branch sends every chunk to it, so the `local` rule never runs in this Debug lane |
| `remote-chunk` | the prefetch → load cycle broke, or `invalidateScripts` threw | `ScriptManager.prefetchScript` / `invalidateScripts` on host remote chunks. The asserts after invalidate read UI state the screen sets itself, so an invalidate that resolves but clears nothing stays green |
| `miniapp-install` | install / show / hide / uninstall of a host mini-app chunk broke | same APIs, second lifecycle; same invalidate gap as `remote-chunk` |
| `host-assets` | asset rules no longer produce what they claim: inline gate (pic-1 87 KB in, pic-2 119 KB out), folder rules (`localAssets` emitted despite being small, `inlineAssets` inlined), the emitted URI is servable (fetch → 200, port and query string taken from the reported URI, never hardcoded). The `.svg` row asserts nothing, and that is honest: svgr compiles at build time, so a broken rule reddens the whole app at boot, before any assert could run | `assets-loader` (inline gate, per-folder rules), served asset route, `@svgr/webpack` rule |
| `nativewind` | CSS stopped computing: `padding-applied: 16` and `calc-width: 248` are layout numbers, not text checks. The dark-mode round trip reads NativeWind's `useColorScheme()` state, not a resolved `dark:` style, and assumes the device starts in light appearance | `NativeWindPlugin` + the host-scoped JSX retag |
| `reanimated` | the worklet pipeline broke — the width row (`100 → 150 → 200 → 100`) is a shared value driven through `useAnimatedStyle` + `useAnimatedReaction` + `scheduleOnRN` (from `react-native-worklets` — reanimated's `runOnJS` re-export is deprecated), so it only moves if user worklets execute; an untransformed worklet throws at boot | the babel `react-native-worklets/plugin` transform; `ReanimatedPlugin`'s `unstable_disableTransform` only suppresses its own rules, which the new babel-swc-loader makes obsolete |

Every row on a screen must own a distinct way to fail. That rule deleted the
third host bitmap fixture (`pic_3.jpg`, 58 KB): under the same 90 KB gate as
`pic_1`, so it could only ever fail where `pic_1` already fails. The same rule is
the filter for any future row.

Navigation is not a subject of its own. The navigator is react-native-screens —
upstream code with upstream tests — and a broken one reddens every test at its
prologue tap anyway. The back-navigation round trip still gets exercised, implied
where a test needs it: `runtime-events` calls `app.back()` and its next step can
only succeed if Home came back.

### Adding a test

1. `FEATURES.ts`: one entry. `screen` is typed against the navigator, so a
   missing route is a typecheck error.
2. `MainNavigator.tsx`: param-list key + `<Main.Screen>`.
3. The screen: root `testID="<feature>-screen"`, and one `<Report>` row per
   value, `testID="<feature>-<thing>-report"`, `name` the bare noun.
4. `e2e/<feature>.e2e.ts`: copy the prologue verbatim — `app.open()`, assert
   `home-screen`, `scrollUntilVisible(entry)` (Home is a ScrollView; a bare tap
   on an off-screen row silently misses), `tap`, assert the screen — then only
   your asserts. No helpers, deliberately: each file reads standalone.
5. Break it once: invert the feature in the config or the screen, watch exactly
   your assert go red, revert.

### CI

Steps: setup → build packages → start servers + wait `/status` → warm both
compilers → check manifest shared versions are real semver → build the app →
device { reverse ×2, install, run } → collect logs → artifacts. Lines worth
knowing about:

| Line | Defends against |
| --- | --- |
| `timeout 180 … until /status` | app launching mid-server-boot → the never-retry bundle alert |
| the two warm `curl`s | a cold compile landing on the device's critical path |
| the semver manifest check | `catalog:` specifiers leaking into manifest shared versions, at the source |
| `adb reverse` ×2, asserted | CI starts servers before the emulator exists, and the server's own reverse does not self-heal |
| `nohup` + `disown` | the runner kills the step's process group at step end |
| install + run inside the emulator action's `script` | the action kills the emulator when the step ends |
| ANR-dialog clear loop before the run | a launcher "isn't responding" dialog swallows every tap; `hide_error_dialogs` does not suppress it |
| `disable-animations: false` | the flag writes `transition_animation_scale` 0.0, which RN and Reanimated both read as "reduce motion on"; the dev warning's LogBox container then eats taps on Home's last row |
| `include-hidden-files: true` on artifacts | `upload-artifact` matching zero files for the dot-dir `.e2e` and still reporting success |
| `if: ${{ !cancelled() }}` on artifacts | losing evidence from a test that failed then passed |
| always tail the server logs | they live outside `.e2e` and are the only evidence that survives a broken upload |

### Traps

- **Tapping `ScriptManager.hooks.resolve`/`hooks.load` replaces the built-in
  loop**, not decorates it — a counter tap that returns `undefined` makes the
  manager resolve nothing. Counters only tap the 4 non-owning hooks; the events
  cover what `resolve`/`load` would have.
- **`extraChunks.include` is matched against chunk names and the numeric chunk
  id** (`OutputPlugin` flattens both). An unanchored pattern can catch other
  chunks whose names contain it, and a near-miss like `/.+local.+/` does not
  match `host-async-local` at all, so the chunk silently falls to the catch-all
  remote rule. The rule is `/^host-async-local$/`. It only applies to builds
  without a dev server; the e2e lane does not exercise it.
- **The ignored LogBox string is load-bearing**: NativeWind's runtime reads RN's
  deprecated `ImageBackground` getter at boot
  (`react-native-css-interop/components.js`) though no screen uses it, and the
  toast covers Home's last row and steals taps. A NativeWind upgrade can change
  the wording; the toast reappearing is the symptom.
- **The shared `babel.config.js` serves all three compilations** (host, mini,
  expo widget — all set `env.context` to the app root). A host-only JSX retag
  goes in `overrides` with a regex (string `test` resolves against the CLI cwd);
  adding it at top level retags `src/mini` too and breaks the remote that
  `gallery` and `runtime-events` load (`miniapp-install` is a host-owned chunk,
  not that remote). The worklets transform must stay top level:
  `react-native-worklets` ships compiled code that still carries `'worklet'`
  directives, and host-scoping it leaves the boot red.
- **`NativeWindPlugin`'s JSX half is a silent no-op** with
  `@callstack/repack/babel-swc-loader` (it only matches rules named
  `builtin:swc-loader`); the operative path is babel detecting
  `transform-react-jsx` and feeding `importSource` to swc.
- **iOS layout numbers are device-dependent** (393 pt vs 402 pt). Assert a
  difference, not a width: `padding-applied: 16` holds everywhere, a raw box
  width does not. Exact pixel quality is out of scope entirely — no assertion
  worth maintaining.
- **iOS CI pods need Ruby ≥ 3.4** via `ruby/setup-ruby` with `working-directory`
  (`gemfile:` is not an input — the action warns, then silently caches nothing).
  The floor exists because of a CocoaPods null-byte crash on pnpm-symlinked
  `node_modules`; CocoaPods remains intermittent there, `bundle update
  cocoapods` is the candidate fix.
- **Native module changes need a rebuild on both platforms**, and iOS may need
  `pod install` twice — the first pass can symlink headers before codegen emits
  `rnworklets/rnworklets.h`. Same trap as the emulator snapshot: the JS bundle
  looks correct while the native side is old.
- **`app.open()` restarts the app** (terminate + relaunch), so module-scope
  counters reset per test — event assertions avoid exact totals only because
  background loads inside one test also bump them.
- Actions are pinned to SHAs verified against the GitHub API (note
  `android-emulator-runner`'s tag is annotated — dereference it). Node matches
  `release.yml`. `.github/actions/setup-pnpm-node` is reused, not re-derived.

---

## Expo lane

Runs `apps/tester-expo`, a real Expo SDK app (expo-router, the
`@callstack/repack-expo` config plugin, `ExpoPlugin`). Only `tester-expo` is
installed on the device; its two Module Federation remotes are dev servers:

| Port | Server | Built from |
| --- | --- | --- |
| 8081 | `tester-expo repack:start` | the Expo host |
| 8082 | `tester-expo-widget repack:start:remote` | `ExpoWidget`, an Expo-built remote |
| 8083 | `tester-federation-v2 start:expo-host-widget` | `OrdinaryWidget`, a plain Re.Pack remote (no `ExpoPlugin`) |

### Where things live

| Path | Role |
| --- | --- |
| `apps/tester-expo/e2e/*.e2e.ts` | One file per feature |
| `apps/tester-expo/e2e.config.ts` | Targets, `retries: 0`, `workers: 1` |
| `apps/tester-expo/FEATURES.ts` | Registry Home renders, in MF2's shape. `href` is a plain string: typed routes are off (they need files only the Expo CLI generates) |
| `apps/tester-expo/ui/` | `Report.tsx`, `ActionButton.tsx` (copies of MF2's), `Screen.tsx` (page layout + root testID), `LoadState.ts` |
| `apps/tester-expo/babel.config.cjs` | Turns off the deep-import warning (see Traps) |
| `.github/workflows/e2e-expo.yml` | Android job (PRs) + iOS job (main, dispatch) |

#### Running it locally

```bash
# boot an emulator/simulator first, as for MF2
pnpm --filter tester-expo repack:start                       # 8081
pnpm --filter tester-expo-widget repack:start:remote         # 8082
pnpm --filter tester-federation-v2 start:expo-host-widget    # 8083
E2E_DEVICE=<name> pnpm exec e2e run --target ios             # in apps/tester-expo
```

The app must be installed (`pnpm repack:android` / `pnpm repack:ios`; `expo
run` generates the native folders, which are not in git). Warm all three
servers first, as in the workflow.

### What is covered

| File | What a red run means | Re.Pack surface |
| --- | --- | --- |
| `expo-module` | an Expo native module can't answer a Re.Pack bundle. The row shows `Constants.expoConfig.name`, which only the native build embeds (from `app.json`); `expoVersion` would pass with the module missing | config plugin (prebuild), `ExpoModulesPlugin` |
| `image` | Expo asset rules, the asset registry or monorepo resolution broke; rows are set in `onLoad`, so the bytes were served. The second image lives in `tests/integration/…`, outside the app | `configureExpoAssets`, `configureExpoModuleResolution` |
| `density-image` | the wrong density variant is picked. Both CI devices resolve to 3, so a bug that always picks `@3x` stays green | `configureExpoAssets` (`platform` option) |
| `font` | a bundled font no longer reaches `expo-font` | `configureExpoAssets` (font branch; `configureAndroidFontAssets` is production-only) |
| `lazy` | the host's `.local` async chunk does not load, proven by the chunk's own content | `configureExpoChunkFilename`, `localChunkResolver` (dev-server path) |
| `expo-widget` | the Expo remote: shared `expo-constants`, its own `EXPO_PUBLIC_*` values vs the host's, `expo-asset` metadata, remote asset scale, its nested chunk | MF2 + `ExpoPlugin` remote side, `inlineExpoPublicEnvironment` |
| `ordinary-widget` | an Expo host can no longer load a remote built without `ExpoPlugin` | MF2 interop |
| `fast-refresh` | an edit no longer reaches the app, or it reloads fully (the counter drops to 0). The test edits `components/FastRefreshLeaf.tsx` and restores it in `finally` | dev server HMR, `WebpackHMRClient`, `react-refresh` |
| `symbolication` | a stack frame no longer maps back to `components/SymbolicationProbe.tsx:<line>`; the test reads `<line>` from the file | source maps, `applyRepackSourceMapFix`, the dev server's `/symbolicate` |

Expected values come from source: the tests read `app.json` and both apps'
`.env.development`. The widgets keep their own testIDs; only the host's screens
use `Report`. Not covered on purpose: Release paths (`repack-expo build`,
packaged `.local` chunks, EAS), the widget as its own app.

### Adding a test

As for MF2, with three differences: the route is a file, `app/<route>.tsx`
(expo-router: file path = URL); its title goes in `app/_layout.tsx`; a wrong
`href` in `FEATURES.ts` is not a type error — the prologue's screen assert
catches it.

### Break-once record

| File | Break | Red at |
| --- | --- | --- |
| `expo-module` | rename the app in `app.json` without a native rebuild | the app-name row (shows the built-in name) |
| `image` | user rule `{ test: /\.png$/, type: 'asset/resource' }` | `local: .png` instead of `local: repack.png` |
| `density-image` | remove `density@3x.png` | `scale: 2` instead of 3 |
| `font` | user rule `{ test: /\.ttf$/, type: 'asset/resource' }` | `font-load-report` |
| `lazy` | the chunk throws on load | `lazy-component-ready` |
| `expo-widget` | wrong `remote.publicPath` in the widget's asset rules | `expo-widget-ready` |
| `ordinary-widget` | rename `'./Widget'` in `configs/rspack.expo-host-widget.mts` | `ordinary-repack-widget-ready` |
| `fast-refresh` | `devServer: { ...devServer, hot: false }` in the host config | `fast-refresh-leaf-report` keeps the old marker |
| `symbolication` | `devtool: false` in the host config | the frame is the bundle URL, not the source file |

A user asset rule only replaces `ExpoPlugin`'s when it covers the whole
extension; a rule for one file name (`/logo\.png$/`) is silently ignored.

### CI

`e2e-expo.yml` is the MF2 workflow plus `expo prebuild` (native folders are not
in git), a third server and `adb reverse tcp:8083`. The semver check runs on
8081 and 8082 only: `OrdinaryWidget` shares with `requiredVersion: false`, so
8083 says `*` by design. The remotes warm on `mf-manifest.json` — any request
compiles the whole platform.

### Traps

- **RN 0.88 turns the first warning into a toast** ("Open debugger to view
  warnings.") that steals taps. The one warning was babel-preset-expo's
  deep-import lint, which fires outside `node_modules`: the linked
  `packages/repack` (`WebpackHMRClient.js`) and `SymbolicationProbe.tsx` (RN
  has no public export for its helpers) both trip it. `babel.config.cjs` turns
  it off — no LogBox filter, so a new warning still shows and a test goes red.
- **A `pnpm install` that re-resolves peers needs fresh dev servers.** A
  running server keeps the old `.pnpm/<pkg>@<hash>` paths and mixes copies —
  boot dies with "Tried to register two views with the same name
  ExpoRouterActivityContents".
- **CocoaPods needs a UTF-8 locale.** Without `LANG=en_US.UTF-8` it crashes
  while printing its own error report. The system CocoaPods works; no `Gemfile`
  (unlike MF2).
- **`fast-refresh` is the only test that edits a source file.** A run killed
  before `finally` leaves `components/FastRefreshLeaf.tsx` changed — check
  `git status` locally.
- **The host config is read once at server start.** A break in
  `rspack.config.mjs` needs an 8081 restart, and so does the revert.
- **After any rebuild, the manifest reports `*` for the `react-native/…`
  deep-import shares**, and the semver check fails. Only the first compile
  after server start has real versions; locally, restart before the check.
- **`asset/source` on font files breaks the whole bundle** ("octals not allowed
  in strict mode"). Use `asset/resource` for breaks.

---

## Debugging a red run (both lanes)

Evidence, in order of usefulness: `.e2e/results/<test>/trace.md` (step-by-step,
with the full node dump at failure), `attempt-*/screenshots/`,
`screen-at-failure.txt`, `logcat.txt` / `ios-syslog.txt`, the dev-server logs —
all uploaded as the `e2e-android` / `e2e-ios` artifact (`e2e-expo-*` in the
Expo lane) even when the run dies before tests start.

| Symptom | Cause | Fix |
| --- | --- | --- |
| `home-screen` never visible, first test of the day | cold dev-server compile eating the boot anchor's budget on first launch | warm the platform bundle ("Running it locally") |
| `home-screen` never visible, screenshot is the status bar / launcher | something owns the screen: ANR dialog, toast | the workflow's ANR clear; locally dismiss and rerun |
| taps do nothing, screen dump says "unchanged" | a toast covers the control — CI screens are ~15 % smaller than devices, so it may not reproduce locally | screenshot proves it; suppress the warning at its source, never with `ignoreAllLogs` |
| everything passes on iOS, fails on Android only | the local emulator is `arm64-v8a`, docs habit is `-PreactNativeArchitectures=x86_64` → `INSTALL_FAILED_NO_MATCHING_ABIS`; or a restored AVD snapshot rolled the APK back | build for `arm64-v8a`; compare `dumpsys package <id>` `lastUpdateTime` against the APK on disk |
| Gallery hangs, nothing loads | 8082 never compiled, or its reverse is missing | the warm step / `adb reverse --list` |
| `404 to be 200` on the asset fetch | the served-asset route needs the query string (`?platform=…&hash=…`) — path alone 404s | the test keeps `pathname + search`; if the URL shape changed, that is the regression |
| `Property '__X__' doesn't exist` redbox | `DefinePlugin` only applies at server start | restart the server after config edits |
| the engine reads an empty/stale screen tree while `adb shell uiautomator dump` sees everything | the engine's snapshot helper is wedged | restart the emulator; reinstall `com.callstack.agentdevice.*` helpers if it persists |
