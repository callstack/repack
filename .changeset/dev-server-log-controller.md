---
"@callstack/repack-dev-server": patch
---

Silence the fastify `FSTDEP023` deprecation warning printed on every dev server start by passing request log suppression through fastify's `logController` option instead of the deprecated top-level `disableRequestLogging` option
