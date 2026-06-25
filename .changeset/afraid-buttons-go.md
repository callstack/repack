---
"@callstack/repack": minor
---

Allow customizing the native HTTP client used to download remote scripts: `RemoteScriptLoader.okHttpClientFactory` on Android and `ScriptManager.urlSessionFactory` on iOS (for SSL pinning, interceptors, custom headers, timeouts, etc.)
