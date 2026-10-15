---
"@callstack/repack": patch
---

Fix `Cannot find module '@babel/plugin-syntax-typescript'` when bundling TypeScript with `babel-swc-loader` or the codegen rules. Re.Pack passed the plugin to Babel by name, so it only resolved when the project happened to have it installed. With pnpm, builds often worked only through the `NODE_PATH` set by script shims and failed when bundling from Xcode or Gradle.

- `@babel/plugin-syntax-typescript` is now a dependency of Re.Pack and is passed to Babel as a resolved path.
- `@babel/core` is now declared as a peer dependency, since Re.Pack's loaders import it.
