---
"@callstack/repack": minor
---

Add an optional `cacheKey` to `ScriptLocator`. When it is set, it is appended to the script's `uniqueId` (`<caller>_<scriptId>@<cacheKey>`), so each key gets its own cache entry and its own file on the device. This lets an app keep several versions of the same script, for example to load the previous version again when a new one fails.
