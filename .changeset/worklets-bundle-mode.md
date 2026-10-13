---
'@callstack/repack-plugin-reanimated': minor
---

Add Worklets Bundle Mode support. `ReanimatedPlugin` now detects `bundleMode: true` in the project's `react-native-worklets/plugin` babel config and sets the bundle up for it: the Worklets entry point and the `prepareBundleMode` polyfill are added to the entry chunk, the module ids Worklets requires by (`-2` and worklet hashes) are translated into the bundler's module ids, the app entry is prevented from booting on a Worklet Runtime, and a cache group keeps every Worklets module in the main chunk. Bundle Mode needs `react-native-worklets` 0.13.0 or newer, which is where the polyfill, `WorkletsModule.prepareBundleMode` and the native ScriptLoader landed; an older version fails the build with that message instead of dying later on an unresolved polyfill request. Also exported as the standalone `WorkletsBundleModePlugin`.
