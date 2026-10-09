---
'@callstack/repack': major
'@callstack/repack-dev-server': major
---

Require React Native 0.79 or newer. Removed code paths for older React Native versions: the pre-0.79 `HMRClient` named exports, the pre-0.79 `DevLoadingView` / `LoadingView` and `AssetSourceResolver` interop, the dev-only `__REACT_NATIVE_MAJOR_VERSION__`, `__REACT_NATIVE_MINOR_VERSION__` and `__REACT_NATIVE_PATCH_VERSION__` globals, `text/plain` symbolication requests, the `enableNewDebugger` dev-middleware experiment, the React Native <= 0.73 Android `CallInvoker` sources and the AGP < 7.3 / pre-0.76 / NDK < 27 Android build branches. The Android library no longer declares its own Android Gradle Plugin classpath and uses `BaseReactPackage`. The iOS pod now uses React Native's `min_ios_version_supported` deployment target instead of iOS 12.
