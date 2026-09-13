---
"@callstack/repack": patch
---

Fix Android configuration on AGP 9, where built-in Kotlin support registers the
`kotlin` extension itself and the explicit `kotlin-android` apply failed with
"Cannot add extension with name 'kotlin'". The plugin - and the `kotlinOptions`
block it contributes - is now applied only when nothing has registered that
extension, leaving AGP 8 and `android.builtInKotlin=false` projects unchanged.
