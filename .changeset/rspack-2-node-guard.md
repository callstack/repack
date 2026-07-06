---
"@callstack/repack": patch
---

Raise a clear error when running the Rspack-based commands with Rspack 2 on Node.js older than 20.19 (Rspack 2 requires Node `^20.19.0 || >=22.12.0`), instead of failing with `ERR_REQUIRE_ESM`. Rspack commands are now loaded lazily so the version check runs before `@rspack/core` is touched.
