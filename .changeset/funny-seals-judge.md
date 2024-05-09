---
"@callstack/repack": major
---

- Fixed deprecated remote debugger integration:
  - Removed vendored code and used middlewares from `@react-native-community/cli-server-api`
  - Removed `package/debugger-app` and replaced it with `@react-native-community/cli-debugger-ui`
- Removed vendored code responsible for integration with Flipper debugger & custom implementation of the Hermes Inspector Proxy
- Added integration with `@react-native/dev-middleware` which enables us to use both Flipper and new experimental debugger
- Added pass-through `experimentalDebugger` flag to CLI commands to ensure compatibility with Metro and new experimental debugger for React Native
