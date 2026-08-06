---
'@callstack/repack': patch
---

Prevent guarded require initialization from throwing in strict-mode bundles by safely copying runtime property descriptors.
