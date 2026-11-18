---
"@callstack/repack": patch
---

Fix `HermesBytecodePlugin` not finding `hermesc` under pnpm (and other symlinked or nested layouts) on React Native 0.82+. The existing locations are still checked first and resolve to the same path. Only when neither exists does the plugin follow the `react-native` symlink and search its `node_modules` hierarchy for `hermes-compiler`. The lookup now runs when the first matching asset is transformed. If no binary is found, the build fails with an error listing every checked path instead of spawning a missing binary.
