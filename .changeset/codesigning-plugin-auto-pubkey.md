---
"@callstack/repack": minor
---

Add `publicKeyPath` and `nativeProjectPaths` options to `CodeSigningPlugin`. When `publicKeyPath` is set, the plugin automatically embeds the public key into `Info.plist` (iOS) and `strings.xml` (Android) during compilation, removing the need for manual native file setup. The `embedPublicKey` utility is also exported for standalone use.
