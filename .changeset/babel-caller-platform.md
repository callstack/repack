---
"@callstack/repack": minor
---

Pass the target platform and the project's `@babel/runtime` version to Babel through caller data, matching what Metro passes to `@react-native/babel-preset`. With React Native 0.88 and newer, `Platform.OS` and `Platform.select()` are now inlined at build time, which lets the minifier drop code for other platforms. With React Native 0.89 and newer, `babel-loader` also imports all Babel helpers from `@babel/runtime` instead of inlining the newer ones into every file.
