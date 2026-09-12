---
"@callstack/repack": patch
---

Support React Native 0.87. Polyfills are read from `rn-get-polyfills.js` when
present, otherwise from `@react-native/js-polyfills` (resolved from the project,
falling back through `@react-native/metro-config`), with an actionable error when
neither can be found. The asset registry request is aliased to
`src/asset-registry.js` on the 0.87 layout; on 0.86 and earlier behaviour is
unchanged.
