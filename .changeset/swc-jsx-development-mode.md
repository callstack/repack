---
"@callstack/repack": patch
---

Make SWC JSX development transforms follow the build mode. `getSwcLoaderOptions` (and `getJsTransformRules`) tied `jsc.transform.react.development` to the JSX runtime, so development builds with the default `automatic` runtime emitted `jsx` instead of `jsxDEV` and lost `__source` / `__self`, accurate component stacks and "open in editor", while `classic` production builds kept them. `getSwcLoaderOptions` no longer sets `jsc.transform.react.development` by default, so Rspack's `builtin:swc-loader` derives it from `mode`, and development builds with the `automatic` runtime now import `<importSource>/jsx-dev-runtime`. Both helpers accept a `development` option to override it, e.g. `getJsTransformRules({ swc: { development: false } })` when a custom `importSource` doesn't ship a `jsx-dev-runtime` entry.
