---
"@callstack/repack": patch
---

Support React Native 0.87. Polyfills are read from `rn-get-polyfills.js` when
present, otherwise from `@react-native/js-polyfills` (resolved from the project,
falling back through `@react-native/metro-config`), with an actionable error when
neither can be found. The asset registry request is aliased to
`src/asset-registry.js` on the 0.87 layout, and `react-native/src/private` is
aliased to disk so first-party packages' deep imports keep resolving once package
exports are enabled (0.87 dropped the `./src/*` export wildcard). On 0.86 and
earlier behaviour is unchanged.
