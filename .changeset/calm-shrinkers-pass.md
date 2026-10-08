---
"@callstack/repack": patch
---

Ship consumer ProGuard rules for the Android library so release builds with R8 (`minifyEnabled true`) no longer fail with missing `com.google.errorprone.annotations` classes referenced by `nimbus-jose-jwt`.
