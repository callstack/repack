---
"@callstack/repack": patch
---

Fix polyfill execution order when using Module Federation by adding a `PolyfillsRuntimeModule` to `NativeEntryPlugin`. Polyfills are now required from a runtime module that runs before Module Federation's startup wrapper, guaranteeing they execute before MF startup.
