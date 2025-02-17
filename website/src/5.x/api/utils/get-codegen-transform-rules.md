# getCodegenTransformRules

A helper function that returns `module.rules` configuration for handling React Native codegen transformation, which is required for projects using [New Architecture](https://reactnative.dev/architecture/landing-page).

:::warning
This helper function is only relevant when using Rspack as your bundler. If you are using webpack with `babel`, you don't need to use this helper function, since it's already included as part of `@react-native/babel-preset`.
:::

## Example

```js title=rspack.config.cjs
const Repack = require("@callstack/repack");

module.exports = {
  module: {
    rules: [...Repack.getCodegenTransformRules()],
  },
};
```
