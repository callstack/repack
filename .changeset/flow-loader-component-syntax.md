---
"@callstack/repack": patch
---

Fix `flow-loader`, and with it `getJsTransformRules`, emitting invalid JavaScript for Flow `component` and `hook` declarations, enums and `match` expressions, which React Native ships since 0.81. Files using them are now compiled with the project's React Native parser (`hermes-parser` or `flow-parser`) and `@babel/plugin-transform-flow-strip-types`, while other files still go through `flow-remove-types`. Lowered enums use `flow-enums-runtime`, resolved from the project or from `react-native`. `component` declarations follow the project's React version (`ref` as a prop on React 19, `forwardRef` on React 18). Also fix `flow-loader` crashing under webpack with `Maximum call stack size exceeded`.
