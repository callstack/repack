---
"@callstack/repack": patch
---

Fix CodeSigningPlugin signing assets at processAssets ANALYSE stage (2000) instead of assetEmitted, ensuring bundles are signed before plugins running at REPORT stage (5000) such as withZephyr() can capture and upload them
