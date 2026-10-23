---
"@callstack/repack": patch
---

Fix bundling Expo SDK 58 (React Native 0.88) projects:

- React Native's explicit subpath exports (`react-native/setup-env`, `react-native/react-private-interface`, `react-native/asset-registry` and `react-native/unstable-internals-do-not-use`) now resolve even when `react-native` is aliased to its directory, as `@callstack/repack-expo` does, or when package exports are disabled. This fixes `Cannot find module 'react-native/react-private-interface'` and `'react-native/setup-env'`. React Native 0.87 and newer still need `enablePackageExports: true` for `@react-native/asset-utils`.
- `@react-native/assets-registry/registry`, still imported by libraries such as `react-native-svg` 15.15 and earlier, now maps to React Native's own asset registry on React Native 0.87 and newer, so assets register in a single registry.
- React Native polyfills are now also resolved through `expo` and `@expo/metro-config` on React Native 0.87 and newer. This fixes `Unable to locate React Native polyfills` in Expo projects, including with pnpm, without adding `@react-native/js-polyfills` by hand. React Native 0.86 and earlier keep using `rn-get-polyfills.js`.
- When `react-native` isn't aliased, it is now resolved from the project rather than from Re.Pack's own location.
