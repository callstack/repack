# getModulePaths

A helper function that generates regular expressions for matching module paths across different package manager formats (npm, yarn, pnpm, bun). You can use these regex patterns in your Rspack/webpack configuration to properly resolve modules regardless of which package manager you use.

## Parameters

```ts
type GetModulePaths = (moduleNames: string[]) => RegExp[];
```

### moduleNames

- Type: `string[]`
- Required: `true`

Array of module names to generate path patterns for.

## Example

```js title=rspack.config.cjs
const Repack = require("@callstack/repack");

module.exports = {
  module: {
    rules: [
      {
        include: Repack.getModulePaths([
          "react-native",
          "react-native-macos",
          "react-native-windows",
        ]),
      },
    ],
  },
};
```
