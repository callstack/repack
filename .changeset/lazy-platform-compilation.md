---
"@callstack/repack": minor
---

Bring the Rspack development experience in line with Webpack by compiling each
platform only when its bundle is first requested. Multi-platform development
servers no longer eagerly build unused platforms, so launching an iOS app does
not wait for Android to compile, and vice versa.
