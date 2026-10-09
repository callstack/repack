---
'@callstack/repack-init': patch
---

Bootstrap new projects with React Native 0.87.1 and refresh the default bundler dependencies to `@rspack/core@^1.7.12`, `@swc/helpers@^0.5.23`, `webpack@^5.111.1` and `terser-webpack-plugin@^5.6.1`. Generated Rspack and webpack configs now enable package exports (`getResolveOptions({ enablePackageExports: true })`).
