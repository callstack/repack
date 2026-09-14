---
"@callstack/repack": patch
---

Fix the assets loader failing on Windows. Public paths for both remote and extracted assets were joined with `path.join`, which rewrites the separators to backslashes on Windows; for remote assets that turned `https://…` into a string `new URL` rejects, so any bundle containing a remote asset failed with `TypeError: Invalid URL`. Both are URLs rather than filesystem paths and are now joined with `path.posix.join`, which produces the same output on Linux and macOS as before.
