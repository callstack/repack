---
"@callstack/repack": patch
---

Support React Native 0.87's runtime layout. The asset registry request and the
polyfill list are now resolved in Node once per build instead of through emitted
`try`/`catch` fallbacks. A canonical `react-native/asset-registry` request is
aliased to the real file (`Libraries/Image/AssetRegistry` on <= 0.86,
`src/asset-registry.js` on >= 0.87), and polyfills are taken from
`rn-get-polyfills.js` when present or from `@react-native/js-polyfills` otherwise,
with a clear error when neither can be resolved.
