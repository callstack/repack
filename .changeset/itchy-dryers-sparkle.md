---
"@callstack/repack": minor
---

### Development server API

Added implementation for API functionalities in `@callstack/repack-dev-server`:
- `GET /api/platforms` - List all platforms with active compilations
- `GET /api/:platform/assets` - List all assets (`name` and `size`) for a given compilation
- `GET /api/:platform/stats` - Get Webpack compilation stats
- Websocket server under `/api` URI for logs and compilations events 
