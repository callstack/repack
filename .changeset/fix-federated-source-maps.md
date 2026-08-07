---
"@callstack/repack": patch
"@callstack/repack-dev-server": patch
---

Fix development symbolication for Module Federation host and remote bundles. The host now follows a remote bundle's declared source map, invalid generated webpack source URLs no longer invalidate an otherwise usable map, symbolication continues when an individual frame cannot be mapped, and code frames use the matching source map's embedded source content. The dev server also logs the first useful symbolicated runtime frame as a fallback when opening the source file from the device is delayed.
