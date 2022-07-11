---
"@callstack/repack": minor
---

### ScriptManager

- Added ability to provide multiple resolvers to `ScriptManager` using `ScriptManager.shared.addResolver`.
- Removed `ScriptManager.configure` and split the functionality into `ScriptManager.shared.setStore` and `ScriptManager.shared.addResolver`.
- Added methods to remove a single resolver and to remove all resolver.
- Returning `undefined` from a resolver will cause next resolver in line to be used (as long as other resolver were added), if no resolver processed the request the error is thrown.

Example:

```js
ScriptManager.shared.setStorage(AsyncStorage);
ScriptManager.shared.addResolver(async (scriptId, caller) => {
  /* ... */
});
```
