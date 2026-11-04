---
"@callstack/repack": patch
---

Fix Flow enums disappearing in `babel-loader` and `babel-swc-loader`: `@react-native/babel-preset` strips enum declarations before its enum plugin runs, leaving references such as React Native's `VirtualViewMode.cast()` undefined at runtime. Both loaders now run the preset's `babel-plugin-transform-flow-enums` ahead of the preset, so enums are lowered to `flow-enums-runtime` (resolved from the project or from `react-native`) in every Flow file, with or without an `@flow` pragma. Flow `component` declarations are also lowered for the project's React version instead of always targeting React 19 (`hermesParserOverrides.reactRuntimeTarget` still takes precedence).
