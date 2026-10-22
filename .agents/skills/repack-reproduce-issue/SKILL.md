---
name: repack-reproduce-issue
description: >
  Use when asked to reproduce, root-cause or fix a Re.Pack bug report (GitHub
  issue, crash log, "X doesn't work with Re.Pack") end to end and unattended:
  pick the right tester app, reproduce the failure on a device or simulator,
  gather evidence with the Re.Pack DevTools agent tools, find the root cause in
  packages/, fix it, and add a regression test.
---

# Reproduce and root-cause a Re.Pack issue

Work through these steps in order and keep notes of every command and its output.
The final report must say what was observed, not only what was inferred.
Runtime inspection is covered by the `repack-debug-runtime` skill; load it
alongside this one.

## 1. Pin the report down

Extract: platform(s), RN version, bundler (Rspack/webpack, `USE_WEBPACK`),
Module Federation version (none, v1, v2), dev vs release, Hermes, and the exact
symptom (error text, stack, which screen). If the report has a repro repo,
read its config before touching ours.

## 2. Pick the closest tester

| Area | Tester |
| --- | --- |
| Async/remote chunks, ScriptManager, assets, NativeWind, Reanimated | `apps/tester-app` |
| Module Federation v1 (`Federated`, `ModuleFederationPluginV1`) | `apps/tester-federation` |
| Module Federation v2, manifests, `preloadRemote`, runtime plugins | `apps/tester-federation-v2` |
| Expo modules / expo-router / `@callstack/repack-expo` | `apps/tester-expo` |
| Pure bundling/resolution, no device needed | `tests/integration`, `tests/resolver-cases`, `tests/metro-compat` |

Prefer a no-device reproduction when the bug is in compilation or resolution:
an integration test or a `pnpm bundle:<platform>` run is faster and deterministic.

## 3. Reproduce

1. `pnpm install && pnpm build` at the root (stale `dist` output causes false
   failures).
2. Pick free ports and your own device. Do not reuse a device or port that
   another session is using (`adb devices`, `lsof -iTCP -sTCP:LISTEN`).
3. Start the dev server(s) with `WITH_ROZENITE=true` and launch the debug build
   (see `repack-debug-runtime` §1). Build native apps once per RN upgrade:
   `cd android && ./gradlew assembleDebug`, or `pnpm ios` for the simulator.
4. Make the minimal code/config change in the tester that triggers the bug.
   Keep it as a separate commit so it can be dropped or turned into a test.
5. Trigger it. Prefer agent tools over UI driving:
   `load-script`, `prefetch-script`, `invalidate-scripts`, `load-remote`,
   `reload`. When the bug needs UI interaction, drive the device with
   `agent-device` if it is available, or with `adb shell input`.
6. Confirm the failure: `get-overview` must show the diagnostic that matches
   the report, or `list-errors` must show the reported error. Take a
   screenshot (`adb exec-out screencap -p`) when the symptom is visual.

If it does not reproduce, record the environment differences (versions,
config, platform) and stop guessing; ask for the missing detail or try the
reporter's repro.

## 4. Find the root cause

- Follow each diagnostic's `ref` to the raw record (`get-script`,
  `get-federation`, `list-federation-events`, `get-dev-server`).
- Compare app-side and server-side evidence. A script 404 plus a
  "similar asset" hint means a URL/filename mismatch; a 200 from the dev server
  plus a ScriptManager `load` error means evaluation or native-side failure.
- Map the failure to source in `packages/repack/src` (ScriptManager, plugins,
  loaders) or `packages/dev-server/src` (routes, symbolication). Read
  `agent_context/` for the area first.
- State the root cause as a falsifiable claim, then verify it: revert or patch
  the suspected line and show the symptom disappears and reappears.

## 5. Fix and lock it in

1. Fix in `packages/`, not in the tester (shipped code must not depend on
   monorepo layout).
2. Add a regression test next to the code (`vitest` in the package) or in
   `tests/integration`. It must fail without the fix.
3. Re-run the reproduction: the diagnostic is gone and the feature works on
   device. Run the package tests plus `pnpm typecheck` and `pnpm lint`.
4. Add a changeset for published packages (`pnpm changeset`).

## 6. Report

Include: environment (device, ports, versions), the repro steps as commands,
the evidence (tool outputs trimmed to the relevant fields), root cause with
file and line, the fix, and the test. Clean up: stop dev servers you started,
`rozenite agent session stop`, and shut down emulators you created.
