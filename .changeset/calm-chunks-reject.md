---
'@callstack/repack': patch
---

Let `ChunkLoadError` propagate through the guarded `__webpack_require__` instead of reporting it as fatal, so a failed dynamic import (including a missing Module Federation exposed chunk) rejects the import promise and can be handled by a React Error Boundary. Other remote loading failures, such as an unreachable remote entry, are not affected by this change.
