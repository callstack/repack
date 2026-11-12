# E2E reviewer: background

Re.Pack's e2e tests run its tester apps on an emulator or simulator, so a
bundling or runtime bug shows up before merge. Each **lane** is one app plus
the dev servers it loads from.

## The lanes

| Lane | App | Dev servers | Workflow |
| --- | --- | --- | --- |
| MF2 | `apps/tester-federation-v2` | 8081 host, 8082 MiniApp remote | `.github/workflows/e2e.yml` |
| Expo | `apps/tester-expo` | 8081 host, 8082 `ExpoWidget` remote, 8083 `OrdinaryWidget` remote (built by `tester-federation-v2`) | `.github/workflows/e2e-expo.yml` |

- Both lanes run **Debug** builds that load JavaScript from Re.Pack dev
  servers built with **Rspack**.
- Android emulator on every PR; iOS simulator on push to `main` and manual
  dispatch.
- The device reaches every dev server as `localhost` (Android through
  `adb reverse`).
- Native code in the apps and in `packages/repack` is compiled from source,
  so a native change runs when a Debug dev-server run executes it.
- JavaScript is transformed by `babel-swc-loader` (MF2) and by Expo's Babel
  loaders (Expo). Code that only touches `builtin:swc-loader` rules, such as
  rules from `getJsTransformRules`, runs in no lane.

## What runs in every lane test

Code Re.Pack adds to every Debug build is exercised by every test of that
lane, so a broken edit there turns the lane red at boot or on first load:

- bundler plugins as the lane apps configure them, and the default Module
  Federation runtime plugins;
- runtime modules injected into every bundle (e.g. `guardedRequire` from
  `RepackTargetPlugin`, `getDevServerLocation`);
- the dev server's asset route, which serves every bundle, chunk and asset.

The tests drive success paths only: no test makes a load fail
(`runtime-events` asserts `error: 0`). Failure paths are still reachable: a
lane screen can point a load at a URL the dev server does not serve.

## What the lanes never reach

Release or production builds (the bundle command, minifiers, Hermes bytecode,
production source maps, Release code signing, embedded bundles, packaged
Android resources), webpack, Module Federation v1, `apps/tester-app`, physical
devices, and any behaviour that differs between an emulator and a real
device.

## Reading a PR against the lanes

- Where code runs comes from the code, not from where the PR description
  says the bug was seen: a bug reported in a Release app is reachable when
  the edited code also runs in Debug.
- A PR that changes only `apps/**` changes the test harness, not Re.Pack.

## Where coverage is documented

- `agent_context/e2e-oct2026/design.md`: the test conventions and, per lane,
  the "What is covered" table (what each test file proves and which Re.Pack
  code it exercises). This is the source of truth for coverage.
- `apps/tester-federation-v2/e2e/*.e2e.ts` and `apps/tester-expo/e2e/*.e2e.ts`:
  the tests themselves; the values they assert come from each screen's
  `<Report>` rows.
