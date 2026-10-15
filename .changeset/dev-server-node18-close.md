---
"@callstack/repack-dev-server": patch
---

Fix dev server shutdown hanging on Node 18 with fastify 5.12+ by force-closing open connections on stop
