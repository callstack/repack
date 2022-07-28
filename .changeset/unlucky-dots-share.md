---
"@callstack/repack": patch
---

### Fix bi-directional imports in Module Federation

`Federated.createRemote` and `Federated.importModule` now load and evaluate each container only once to support bi-directional
container imports and cycling dependencies.
