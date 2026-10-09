---
'@callstack/repack': major
'@callstack/repack-dev-server': major
---

Require React Native 0.82 or newer with the New Architecture. The native module is now built only as a TurboModule: the legacy architecture Android sources, the `IS_NEW_ARCHITECTURE_ENABLED` build config field and the iOS `RCT_NEW_ARCH_ENABLED` branches were removed, and Android reads the call invoker from `ReactContext` instead of `CatalystInstance`. Also removed code paths for older React Native versions: the pre-0.79 `HMRClient` named exports, the pre-0.79 `DevLoadingView` / `LoadingView` and `AssetSourceResolver` interop, the dev-only `__REACT_NATIVE_MAJOR_VERSION__`, `__REACT_NATIVE_MINOR_VERSION__` and `__REACT_NATIVE_PATCH_VERSION__` globals, `text/plain` symbolication requests, the `enableNewDebugger` dev-middleware experiment, the React Native <= 0.73 Android `CallInvoker` sources and the AGP < 7.3 / pre-0.76 / NDK < 27 Android build branches. The Android library no longer declares its own Android Gradle Plugin classpath and uses `BaseReactPackage`. The iOS pod now uses React Native's `min_ios_version_supported` deployment target instead of iOS 12.
