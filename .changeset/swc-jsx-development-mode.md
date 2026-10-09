---
"@callstack/repack": patch
---

Make SWC JSX development transforms follow the build mode. `getSwcLoaderOptions` (and `getJsTransformRules`) tied `jsc.transform.react.development` to the JSX runtime, so development builds with the default `automatic` runtime emitted `jsx` instead of `jsxDEV` and lost `__source` / `__self`, accurate component stacks and "open in editor", while `classic` production builds kept them. `RepackPlugin` now sets it from `mode` for every `builtin:swc-loader` rule that doesn't set it explicitly, and both helpers accept a `development` option to override it.
