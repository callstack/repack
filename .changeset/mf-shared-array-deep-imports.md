---
"@callstack/repack": patch
---

Read the `react-native` config from the array form of `shared` in `ModuleFederationPlugin`, so the generated `react-native/` and `@react-native/` deep imports inherit its `eager`, `import` and `version` values instead of falling back to the defaults.
