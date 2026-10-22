---
name: repack-debug-runtime
description: >
  Use when inspecting a running Re.Pack app or dev server to find out why
  something fails at runtime: chunks or scripts not loading (404, timeouts,
  cache), Module Federation remotes/shared packages misbehaving, compilation or
  HMR errors, LogBox stacks that are not symbolicated, or uncaught JS errors.
  Covers starting the tester apps with the Re.Pack DevTools plugin, the
  `rozenite agent` tools of `callstack/repack-devtools`, the
  `/repack-devtools/*` dev-server endpoints, and playbooks per failure type.
---

# Debug a running Re.Pack app

`packages/repack-devtools-plugin` (private, workspace only) records what
Re.Pack does at runtime and on the dev server, computes diagnostics, and
exposes them two ways:

- **App side** (needs a running app): `rozenite agent callstack/repack-devtools <tool>`
- **Dev-server side** (works without an app, even when the bundle fails to
  build): `curl <origin>/repack-devtools/state`

Both are wired into every tester app behind `WITH_ROZENITE=true`. Never touch
ports or devices you did not start: other sessions often own `8081` and
`emulator-5554`.

## 1. Start

```sh
cd apps/tester-app                    # or tester-federation, tester-federation-v2, tester-expo
WITH_ROZENITE=true pnpm start --port 8091   # MF testers: start:hostapp / start:miniapp
```

The log must show `[Rozenite] Loaded N plugin(s)` including
`@callstack/repack-devtools-plugin`. Check the endpoint before launching the app:

```sh
curl -s localhost:8091/repack-devtools/state?requests=none
```

Point a debug build at the port (Android; package ids are in each `app.json`):

```sh
adb -s <serial> reverse tcp:8091 tcp:8091
adb -s <serial> shell "run-as <pkg> sh -c 'mkdir -p shared_prefs && echo \"<?xml version=\\\"1.0\\\" encoding=\\\"utf-8\\\" standalone=\\\"yes\\\" ?><map><string name=\\\"debug_http_host\\\">localhost:8091</string></map>\" > shared_prefs/<pkg>_preferences.xml'"
adb -s <serial> shell am force-stop <pkg>
adb -s <serial> shell am start -n <pkg>/com.microsoft.reacttestapp.MainActivity
```

MF remotes have fixed URLs in the host config (`localhost:8082`, `8083`); also
`adb reverse` those ports. On iOS simulators, `localhost` already reaches the
host; use the dev menu or `RCT_jsLocation` to change the port.

## 2. Inspect

Run from an app directory so `rozenite` resolves (`pnpm exec rozenite …`).
Pass `--port <dev server port>` to every call.

```sh
pnpm exec rozenite agent targets --port 8091                  # app connected?
pnpm exec rozenite agent callstack/repack-devtools get-overview --port 8091
pnpm exec rozenite agent session stop --port 8091             # when done
```

**Always start with `get-overview`.** It returns app info (platform, RN
version, bundle URL, public path, dev server), record counts, and
severity-sorted `diagnostics` merged from the app and the dev server. Every
diagnostic has a `ref` that tells you which tool gives details:

| `ref` | Follow up with |
| --- | --- |
| `<script uniqueId>` | `get-script --uniqueId <ref>`, `get-script-manager` |
| `call:<seq>` | `list-script-calls --uniqueId <id>` |
| `fault-<n>` / `server-fault-<n>` | `list-faults` (injected by you; not a real bug) |
| `federation-event:<seq>` | `list-federation-events --errorsOnly true` |
| `<instance>:<scope>/<pkg>` | `get-federation` |
| `err-<n>` | `get-error --id <ref>`, then `symbolicate --errorId <ref>` |
| `request:<seq>` | `get-dev-server --requests failed` |
| `compilation:<platform>` | `curl <origin>/repack-devtools/compilation?platform=<platform>` |

### Tools

Read-only: `get-overview [--devServer false]`, `list-scripts [--status failed] [--search x]`,
`get-script --uniqueId`, `list-script-events [--uniqueId] [--since seq]`,
`get-federation`, `list-federation-events [--type] [--errorsOnly true]`,
`list-errors [--source global-handler|script-manager|federation]`, `get-error --id`,
`symbolicate [--stack "<raw stack>"] [--errorId]`,
`get-dev-server [--origin http://localhost:8082] [--requests failed|all|none]`,
`list-script-calls [--uniqueId] [--method loadScript] [--errorsOnly true]`,
`get-script-manager`, `list-faults [--origin]`.
List tools paginate with `--limit` and `--cursor` (take the cursor from `page`).

Actions, to reproduce issues without driving the UI:
`load-script --scriptId <id> [--caller <id>]`, `prefetch-script`,
`invalidate-scripts [--scriptIds a,b]`, `load-remote --id Remote/Module [--instance]`,
`clear [--scope scripts|federation|errors|all]`, `reload`.

Fault injection, to test error handling and recovery without editing app code:

- `inject-script-fault --stage resolve|load [--scriptId x] [--caller y]
  [--action fail|delay] [--delayMs n] [--times n] [--code c]`: through
  ScriptManager hooks. `resolve` throws before resolvers run (a resolver that
  fetches a manifest while offline); `load` throws before the download with
  `NetworkFailure` (loadScript only).
- `inject-server-fault --match <substring|/regex/> [--status 503]
  [--delayMs n] [--drop true] [--times n] [--platform] [--origin]`: on any
  dev server wrapped with `withRepackDevTools`, including MF remotes. Faulted
  responses carry `fault` in the request log; dropped connections are logged
  with `status: 0`.
- `clear-faults [--id] [--origin]`. Faults stay active until `--times` is
  used up; always clear them when done, and remember that the overview's
  `faults` diagnostics mean failures you caused yourself.

### Dev-server endpoints (curl, no app needed)

- `GET /repack-devtools/state?requests=failed|all|none`: per-platform
  compilation (`status`, `builds`, errors, warnings, assets, changed files),
  request log (failed requests keep the first 4 KB of the response body), and
  diagnostics.
- `GET /repack-devtools/compilation?platform=android`: one compilation in full.
- `POST /repack-devtools/clear`: empties the request log.
- `GET|POST|DELETE /repack-devtools/faults[?id=]`: list, add (JSON body like
  `inject-server-fault`) or remove server faults.

Every MF dev server has its own endpoint (host and each mini app).
`builds: 0` with `status: compiling` means that platform was never requested.

## 3. Playbooks

**Chunk / script fails to load.** `list-scripts --status failed`, then
`get-script`. `error.stage` says where it broke (`resolve` = no resolver
matched or the resolver threw; `load` = download or evaluation;
`create` = bad locator). Compare `locator.url` with the dev server: a 404
diagnostic lists emitted assets with similar names. If the record shows
`source: cache`, call `invalidate-scripts` and `load-script` again to tell
cache problems from server problems.

**Retry / recovery after a failure.** Inject the failure once
(`inject-script-fault --stage resolve --scriptId X --times 1`, or
`inject-server-fault --match X --status 503 --times 1`), call `load-script`
twice, then `list-script-calls --uniqueId X`. A healthy retry shows
`resolverRan: true` on the second call. `resolverRan: false` with
`joined: rejected load` means ScriptManager returned the stored failure
instead of trying again; `get-script-manager` then lists that promise as
`rejected` (issue #1506). The same check works for prefetch-then-load and for
concurrent callers (`joined: pending ...` is expected deduplication).

**Resolver and cache behaviour.** `get-script-manager` lists resolvers with
priorities, taps per hook and cache entries. `list-script-calls` tells how
often resolvers really ran versus calls served from a stored promise; compare
with the dev server request log to see what was actually downloaded.

**Module Federation.** `get-federation` shows each host instance's remotes
(`loaded`), shared packages per scope with every registered version, who
provided it (`from`), and which one is `loaded`. Diagnostics flag singletons
loaded twice and loaded versions that miss a `requiredVersion`. For load
failures, `list-federation-events --errorsOnly true` gives the hook,
remote entry URL and error. Then check the remote's own dev server:
`get-dev-server --origin http://localhost:8082 --requests failed`.
Use `load-remote --id MiniApp/<exposed>` to retry a single remote load.
If `runtimePluginInstalled` is false, MF events are not recorded: add
`require.resolve('@callstack/repack-devtools-plugin/mf-runtime-plugin')` to
`runtimePlugins`, or call `installRepackDevTools()` in the entry.

**Compilation or HMR broken.** Use curl, since the app may not load.
`compilations[].errors` carry ANSI-stripped messages with module names, and
`changedFiles` lists what triggered the last rebuild.

**Unsymbolicated stacks / `/symbolicate` 400.** Run `symbolicate` (no args
throws and symbolicates a probe error in the app) or
`symbolicate --errorId err-N`. Frames with `unmapped: true` still point at a
bundle URL; `sourceMaps[]` gives the HTTP status of each bundle's `.map`.
Re.Pack's `/symbolicate` only keeps frames whose `file` is an http(s) URL, and
answers 400 "Cannot infer platform" when none carries a platform (query
`platform=` or `name.<platform>.bundle`).

**Uncaught errors.** `list-errors`, `get-error --id`, then
`symbolicate --errorId`.

## Gotchas

- **Agent tool calls time out after about 30 s**: a `load-script` that waits
  on a long injected delay times out on the agent side while the app keeps
  going. Read the outcome afterwards with `list-script-calls`.
- **`resolverRan` reads as "ScriptManager reached its resolve step during
  this call".** It is false when an injected `resolve` fault fired (check the
  `faults` column) and for calls that only joined another attempt (`joined`
  set).
- **MF manifest errors hide the HTTP status**: MF parses error pages as JSON,
  so a 4xx/5xx shows up as `JSON Parse error`. The `afterLoadManifest` event
  `detail` has `HTTP <status>`.

- **Startup is only captured** when the entry calls
  `installRepackDevTools({ boot: true })` before other code
  (`app.bootRecording: true`). The testers do this.
- **After a reload the agent session goes stale**: tool calls time out with
  `Tool call timeout` or `ReactNativeApplication.enable timed out`. Run
  `rozenite agent session stop` and retry; the new runtime starts with empty
  records.
- **Rebuilding the plugin package while a dev server runs** (`pnpm build` wipes
  `dist` first) leaves the server's resolver with a stale
  `Cannot find module '@callstack/repack-devtools-plugin'`. Restart the dev
  server, then relaunch the app.
- **"More than one device is connected"**: every app pointed at the port
  (including a previous tester left running on the same emulator) is a
  target. Pass `--device <id>` from `rozenite agent targets` or set
  `ROZENITE_DEVICE`, or force-stop the other app.
- **`Unknown domain "callstack/repack-devtools"`** means the app has not
  called `useRepackDevTools()` yet: it crashed or is stuck before the first
  render. Read `rozenite agent console getMessages --limit 40` and take a
  screenshot.
- Launch Android apps with
  `adb shell am start -n <pkg>/com.microsoft.reacttestapp.MainActivity` for
  the testers; `monkey` launches are unreliable.
- Ignore the `/_expo/*` and `/json*` requests made by DevTools; the request log
  already filters them.
- `rozenite agent domains` lists only built-in domains on some versions. Call
  `rozenite agent callstack/repack-devtools` to list the plugin's tools.
- Rozenite's own docs: `pnpm exec rozenite skills list` / `skills show <name>`.
- From scripts, use `@rozenite/agent-sdk` with the typed descriptors in
  `@callstack/repack-devtools-plugin/sdk` (`repackDevToolsTools.getOverview`).
