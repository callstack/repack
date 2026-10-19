---
"@callstack/repack-plugin-nativewind": patch
---

Configure the NativeWind JSX import source for `builtin:swc-loader` rules nested in `oneOf` or `rules`, such as the ones from `getJsTransformRules`. Previously only top-level rules were updated, so JSX kept importing from `react`.
