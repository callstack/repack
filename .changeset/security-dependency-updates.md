---
"@callstack/repack": patch
"@callstack/repack-dev-server": patch
---

Update dependencies to resolve reported security advisories.

`@callstack/repack-dev-server` raises its minimum versions for `@fastify/middie`, `fastify`, `http-proxy-middleware`, `launch-editor` and `ws`. `@callstack/repack` raises `image-size`, and pins `terser-webpack-plugin` to 5.5.0: it no longer depends on the vulnerable `serialize-javascript`, and it is the last release before 5.6.0, which silently skips minification under Rspack and leaves production bundles unminified. All bumps stay within the existing major versions, so there are no API changes.
