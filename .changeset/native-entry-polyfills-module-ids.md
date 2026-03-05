---
"@callstack/repack": patch
---

Fix production bundles so `NativeEntryPlugin` keeps polyfills on module-id based `__webpack_require__(id)` startup.
