---
"@callstack/repack": patch
---

Fix missing source code frames on the React Native redbox when using webpack. The dev server resolves symbolicated stack frames to absolute paths, but the webpack compiler joined them onto the project root a second time, so the file was never found and every frame was rendered without its source.
