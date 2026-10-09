# Applied to apps that depend on Re.Pack when R8/ProGuard is enabled (minifyEnabled true).

# nimbus-jose-jwt (used by code signing) bundles a shaded Gson that references
# Error Prone annotations. They are compile-time only and not on the runtime classpath.
-dontwarn com.google.errorprone.annotations.**
