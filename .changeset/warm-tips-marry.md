---
"@callstack/repack": patch
---

fix(android): load inspector libraries on initialization

Fixes `UnsatisfiedLinkError` on React Native 0.80 and above by loading inspector libraries when `ScriptManagerModule` is initialized.
