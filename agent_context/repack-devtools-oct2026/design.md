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
| Sources | `ScriptManager.shared` events, `ErrorUtils` global handler, MF 2 runtime hooks, `__FEDERATION__` / `__webpack_require__.S` | compiler `watchRun`/`invalid`/`done`, a request-log middleware |
| Exposed via | Rozenite agent tools + RPC to panels | `GET /repack-devtools/state`, `/compilation`, `POST /clear` |

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
