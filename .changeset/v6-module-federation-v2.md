---
'@callstack/repack': major
---

Drop Module Federation V1 and require `@module-federation/enhanced` 2.0 or newer. Removed `ModuleFederationPluginV1` and the `Federated` helpers (`Federated.SHARED_REACT`, `Federated.SHARED_REACT_NATIVE` and `Federated.createRemote` from `@callstack/repack`, `Federated.createURLResolver` and `Federated.importModule` from `@callstack/repack/client`). `Repack.plugins.ModuleFederationPlugin` is now an alias of `ModuleFederationPluginV2`.
