# Re.Pack DevTools plugin: Technical Design

`packages/repack-devtools-plugin` (`@callstack/repack-devtools-plugin`,
`private`, workspace only) is a [Rozenite](https://www.rozenite.dev) plugin
that records what Re.Pack does at runtime and on the dev server, turns it
into diagnostics, and exposes the result to DevTools panels and to agents.
The goal is unattended reproduction and root-causing of Re.Pack issues.
Agent workflows live in the `repack-debug-runtime` and
`repack-reproduce-issue` skills (`.agents/skills`).

## Two halves

| | App (React Native) | Dev server (Node) |
| --- | --- | --- |
| Entry | `react-native.ts` (`installRepackDevTools`, `useRepackDevTools`, MF runtime plugin) | `bundler.ts` (`withRepackDevTools`) |
| Store | `globalThis.__REPACK_DEVTOOLS_STORE__` | `globalThis.__REPACK_DEVTOOLS_DEV_SERVER_STORE__` |
| Sources | `ScriptManager.shared` events and wrapped methods, `ErrorUtils` global handler, MF 2 runtime hooks, `__FEDERATION__` / `__webpack_require__.S` | compiler `watchRun`/`invalid`/`done`, a request-log middleware |
| Exposed via | Rozenite agent tools + RPC to panels | `GET /repack-devtools/state`, `/compilation`, `POST /clear`, `GET\|POST\|DELETE /faults` |

The halves are joined by the app: `get-overview` and `get-dev-server` fetch
`<devServer>/repack-devtools/state` from the device, so one call returns app
and bundler diagnostics. The dev-server half also works alone (curl). That is
the only option when the bundle does not build.

## App side

- `installRepackDevTools({ boot })` attaches recorders once per JS runtime
  (`store.hooked` guards). Called from the entry file so startup is captured;
  `useRepackDevTools()` calls it too and registers the RPC handlers
  (panels) and agent tools (`useRozenitePluginAgentTool`).
- `scriptManagerRecorder.applyScriptManagerEvent` is a pure reducer from
  ScriptManager event payloads to `ScriptRecord`s (keyed by ScriptManager's
  unique id `<caller>_<scriptId>`) and a bounded event log. Error stage comes
  from the ScriptManager message, error code from `originalError.code` or a
  `[CODE]` argument.
- `callTracer.ts` replaces `loadScript`, `prefetchScript` and
  `invalidateScripts` on the `ScriptManager.shared` instance (`Reflect.set`)
  with wrappers that return the original promise. Every caller goes through
  the instance (webpack chunk runtime, MF CorePlugin/PrefetchPlugin,
  `Federated.importModule`, app code), so all calls are seen. A call records
  whether `scriptsPromises[uniqueId]` already existed (`joined`, with the
  stored promise's state) and whether a `resolving` event followed
  (`resolverRan`). "Error, joined a rejected promise, no resolver" is the
  #1506 signature. A call that joined a stored load (or any stored promise,
  for prefetchScript) is never credited with events, since ScriptManager
  emits `resolving` after `await initCache()` and a joiner would otherwise
  pick up the original attempt's events. A load that joined a prefetch only
  counts events after the prefetch settled. The wrapper returns a derived
  promise that rethrows: the tracer's own handler marks ScriptManager's
  promise as handled, and returning that promise would hide "Possible
  unhandled promise rejection" warnings for callers that never catch.
  `resolverRan` is false for calls that failed in `beforeResolve` (injected
  resolve faults), because `resolving` is emitted after that hook.
- `promiseTracker.ts` learns promise states without unhandled rejections
  (attach `then(ok, err)`, WeakMap); `scriptManagerInspector.ts` reads the
  TS-protected `scriptsPromises`, `resolvers`, `hookMap[*].taps`, `cache`
  and `storage`, waits one tick and flags stored rejected promises.
- Runtime cost (dev only; `react-native.ts` swaps everything for no-ops in
  production): a bounded record per ScriptManager call, one extra microtask
  before callers see the result, and, after the first injected fault, a
  pass-through `beforeResolve`/`beforeLoad` tap for the rest of the JS
  runtime. The inspector reads protected fields and degrades to empty values
  if they are renamed.
- `faults.ts` taps `hooks.beforeResolve` / `hooks.beforeLoad` lazily on the
  first injected fault (hooks cannot be removed; without faults they pass
  through). A throw in `beforeResolve` follows ScriptManager's resolve error
  path, a throw in `beforeLoad` the load error path (`errorLoad`, error code
  from the thrown error). `prefetchScript` has no load hooks, so `load`
  faults only affect `loadScript`.
- `federation/runtimePlugin.ts` is an MF 2 runtime plugin that only observes:
  waterfall hooks return their arguments, error hooks return `undefined` so
  MF's own recovery stays in charge. It is installed through `runtimePlugins`
  (`./mf-runtime-plugin` export) or registered on live instances and
  `__GLOBAL_PLUGIN__` by `installRepackDevTools`. Plugins are deduped by name.
- `federation/state.ts` reads instances, remotes, the module cache and share
  scopes, and diagnoses duplicate singletons, `requiredVersion` mismatches
  (small semver subset, unknown ranges never flag), non-semver versions
  (`catalog:`/`workspace:` copied from package.json), and failed
  remote/manifest loads.
- `symbolication.ts` posts only frames whose `file` is an http(s) URL to
  `/symbolicate`. Re.Pack's symbolicator drops the others and returns a
  shorter array, so results are matched by position against that subset. It
  then `HEAD`s source maps of frames that stayed unmapped.
- Everything read from globals, event payloads or JSON goes through
  `shared/guards.ts` (`unknown` + field readers). Upstream shape changes
  degrade to missing data and never need casts.
- Production builds: `react-native.ts` swaps the implementations for no-ops
  when `NODE_ENV === 'production'`, like the official Rozenite plugins.

## Dev-server side

`withRepackDevTools(config, { enabled })` wraps a Re.Pack config (object or
function). It only changes configs evaluated with `env.devServer` (never
`bundle`), adds `RepackDevToolsCollectorPlugin({ platform })`, and prepends
the state and request-log middlewares through `devServer.setupMiddlewares`.
Middlewares are marked `__repackDevTools` so they are added once. The
request log captures the first 4 KB of failed responses (the dev server's
explanation) and skips tooling paths. Diagnostics compare 404'd asset URLs
with the platform's emitted asset names.

A fault middleware runs after the request log, so faulted responses are
logged and marked with `fault` (via the `x-repack-devtools-fault` header).
Faults match a URL substring or `/regex/`, optionally method and platform,
and answer with a status, a delay (then serve normally), or a destroyed
socket. Responses that close without finishing are logged with status `0`
(`shared/requests.ts`), which also catches real client timeouts. Requests
produced by a fault are reported as `faults` info diagnostics, not errors.
Agents add server faults through the app (`inject-server-fault`, which POSTs
to the origin) or with curl.

## Validation (Oct 2026, Android emulator, no app code changes)

- #1506: `inject-script-fault --stage resolve --times 1`, then two
  `load-script` calls. The retry failed in 0 ms with `joined: rejected load`,
  `resolverRan: false`, and `get-script-manager` listed the rejected promise.
- Chunk 503/drop/timeout via server faults: load errors are cleaned up and
  the retry downloads again (no caching of failures on the load path).
  A 40 s delay surfaced as `NetworkFailure: timeout` after 30 s.
- MF 2 manifest 503: MF parses the error body (`JSON Parse error`) without
  checking `res.ok`, and drops `manifestLoading[url]` so the retry works. The
  runtime plugin now records `HTTP <status>` from `afterLoadManifest`'s
  `response`.
- Every `loadRemote` makes MF call `prefetchScript(<container>)` again, and
  resolvers run each time even when the container is loaded (relevant for
  network-backed resolvers, e.g. #726). Not yet investigated.

## Build

`rozenite build` compiles panels with Vite and the React Native/SDK entry
points with `tsc` (ESM + a CommonJS pass using `moduleResolution: node10`).
TypeScript 7 removed `node10`, so `scripts/rozenite.mjs` runs the CLI with
TypeScript 5 (the `typescript-5` alias) as `tsc`. The package's own
`typescript` stays the workspace version. Otherwise pnpm resolves
`react-native`'s `typescript` peer differently from the apps and the testers
bundle two React Native copies. `tsconfig.json` maps `react-native` types for
`node10`, because RN >= 0.87 only declares types through `exports`.
`tsc -p tsconfig.bundler.json` builds `bundler.ts` as NodeNext ESM.

## Tester integration

All four testers depend on it (`workspace:*`), call
`installRepackDevTools({ boot: true })` in the entry (not tester-expo, whose
entry is `expo-router/entry`) and `useRepackDevTools()` in the root, and wrap
configs with `withRepackDevTools` behind `WITH_ROZENITE=true`, including MF
mini-app configs. tester-federation-v2's host also adds the runtime plugin
through `runtimePlugins` in development.
