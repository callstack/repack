---
"@callstack/repack-init": patch
---

Fix npm-based project creation by using `npm exec ... -- rnc-cli` instead of a nested `npx` invocation, and pass a fully qualified React Native patch version to the React Native CLI.
