---
"@callstack/repack": minor
---

Since `ScriptManager` has `prefetchScript` and `loadScript` methods which use `resolveScript` under the hood, there is a possible way to add a point between resolving script and loading it. In this point user could control the way Repack updates the script (fetch from network or use cached one).

There was introduced new optional callback `shouldUpdateScript`, that could be passed into so called locator or a kind of config in `addResolver` callback function return statement.
```
shouldUpdateScript?: (
    scriptId?: string,
    caller?: string,
    isScriptCacheOutdated?: boolean
) => Promise<boolean> | boolean;
```
`shouldUpdateScript` callback receives `scriptId` and `caller` to identify the script. New `isScriptCacheOutdated` argument helps to identify if script is changed comparing to the cached one, since user has no ability to work directly with cache. It compares method, url, query, headers and body of the script request and set true if any of this params was changed or false when the script cache is up to date or there is no cache for the script.
Since `shouldUpdateScript` will be called on every `resolveScript` call it is necessary to provide correct conditions when script should be loaded or use already existing cache logic.
If cache is opt-out for the script, `isScriptCacheOutdated` will always be false.
