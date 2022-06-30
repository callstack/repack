---
"@callstack/repack-dev-server": minor
---

### Development server API

Added API endpoints to `@callstack/repack-dev-server`:
- `GET /api/platforms` - List all platforms with active compilations
- `GET /api/:platform/assets` - List all assets (`name` and `size`) for a given compilation
- `GET /api/:platform/stats` - Get compilation stats
- Websocket server under `/api` URI for logs and compilations events 
