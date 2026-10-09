---
"@callstack/repack": patch
---

Fix `Cannot find module` errors for Babel plugins that Re.Pack injects by name. They only resolved when the plugin happened to be installed in the project, so with pnpm builds often worked only through the `NODE_PATH` set by script shims and failed when bundling from Xcode or Gradle.

- `@babel/plugin-syntax-typescript` (babel-swc-loader and codegen rules) is now a dependency of Re.Pack. The project's own copy is still preferred when installed.
- The codegen rules now use the new `@callstack/repack/babel-plugin-codegen`, which resolves `@react-native/babel-plugin-codegen` through the project's `@react-native/babel-preset`.
- `@babel/core` is now declared as a peer dependency, since Re.Pack's loaders import it.
