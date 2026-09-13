---
"@callstack/repack": patch
---

Fix `BabelPlugin` to set the `babel-loader` entry of `resolveLoader.fallback` as an array containing the resolved path, instead of a plain string. Rspack's resolver and downstream tools that consume the resolved loader config (e.g. `RSDoctor`) expect the value to be an array; a bare string triggered `Given napi value is not an array on NapiResolveOptions.fallback`. This still matches Rspack's `ResolveAlias` (`{ [x: string]: string | false | (string | false)[] }`) and Webpack's resolver loader fallback shape.