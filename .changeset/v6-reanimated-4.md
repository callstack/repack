---
'@callstack/repack-plugin-reanimated': major
---

Require `react-native-reanimated` 4 or newer, since Reanimated 3 doesn't support React Native 0.82. `ReanimatedPlugin` now throws for Reanimated 3, always requires `react-native-worklets`, and only uses `react-native-worklets/plugin`. `reanimated3ModuleRules` was removed; use `reanimated4ModuleRules`.
