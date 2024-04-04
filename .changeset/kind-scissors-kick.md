---
"@callstack/repack": major
---

BREAKING CHANGE:

`getResolveOptions` is now way more compatible with `metro-resolver` and `@react-native/metro-config`

1. `getResolveOptions` now accepts a second optional parameter called options with the following properties:
   - `enablePackageExports` - defaults to `false`
   - `preferNativePlatform` - defaults to `true`
2. Order of extensions was changed to match the order from `@react-native/metro-config`.
3. Resolution via Package Exports (`exports` field in package.json) is now optional and disabled by default.
   It can now be enabled via `getResolveOptions` options parameter. This change was introduced to match `metro` defaults.
4. Default `conditionNames` are now: `['require', 'import', 'react-native']` and match `@react-native/metro-config` defaults.
