---
"@callstack/repack": patch
---

Fix `ScriptManager.loadScript` and `ScriptManager.prefetchScript` caching a failed resolution forever. `resolveScript` was awaited outside the `try`/`finally` that clears `scriptsPromises`, so when a resolver threw (e.g. the device was offline while fetching the script URL), the rejected promise stayed cached and every later call for the same script returned that same error without calling the resolvers again, until the app was restarted. The rejected promise is now removed when resolving fails, so the next call retries.
