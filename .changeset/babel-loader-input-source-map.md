---
"@callstack/repack": patch
---

Fix `babel-loader` and `babel-swc-loader` failing with `SyntaxError: "[object Object]" is not valid JSON` when a previous loader passes its source map as an object, e.g. `flow-loader` (for lowered Flow syntax or with `pretty: true`) or the stock `babel-loader` used by `getCodegenTransformRules`. Both loaders now accept serialized and object source maps.
