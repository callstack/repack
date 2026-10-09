---
'@callstack/repack': major
'@callstack/repack-dev-server': major
---

Require React Native 0.79 or newer. Removed code paths for older React Native versions: the pre-0.79 `HMRClient` named exports, `text/plain` symbolication requests, the `enableNewDebugger` dev-middleware experiment, the React Native <= 0.73 Android `CallInvoker` sources and the AGP < 7.3 / pre-0.76 Android build branches. The iOS pod now uses React Native's `min_ios_version_supported` deployment target instead of iOS 12.
