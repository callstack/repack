---
"@callstack/repack": patch
---

Fail with a clear, actionable error when using `ModuleFederationPluginV1` under Rspack 2 without `@module-federation/runtime-tools` installed. In Rspack 2 the package became an optional peer dependency of `@rspack/core` and is no longer installed automatically, which previously surfaced as a cryptic module resolution failure at build time.
