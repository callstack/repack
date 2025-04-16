# getFlowTransformRules

A helper function that generates `module.rules` configuration for handling Flow type annotations in JavaScript files. The rules use `@callstack/repack/flow-loader` to remove Flow types from the code before other processing.

:::info
This helper function is a part of [`getJsTransformRules`](/api/utils/get-js-transform-rules).
:::

:::warning
This helper function is only relevant when using Rspack as your bundler. If you are using webpack with `babel`, you don't need to use this helper function, since it's already included as part of `@react-native/babel-preset`.
:::

## Parameters

```ts
interface GetFlowTransformRulesOptions {
  include?: string[];
  exclude?: string[];
  all?: boolean;
  ignoreUninitializedFields?: boolean;
  removeEmptyImports?: boolean;
}
```

### options

- Required: `false`

Configuration options for Flow transformations

### options.include

- Type: `string[]`
- Default: predefined set of React Native libraries that use Flow

Array of module names to include for Flow transformation.

:::tip
Pass module names as they appear in `package.json`. You can use full package names or scopes.
:::

```js
{
  include: [
    // Include specific package
    "react-native",
    "react-native-vector-icons",
    // Include all packages from a scope
    "@react-native",
  ];
}
```

### options.exclude

- Type: `string[]`
- Default: `[]`

Array of module names to exclude from Flow transformation.

:::tip
Pass module names as they appear in `package.json`. You can use full package names or scopes.
:::

```js
{
  exclude: [
    // Exclude specific package
    "react-native-vector-icons",
    // Exclude all packages from a scope
    "@react-native-community",
  ];
}
```

### options.all

- Type: `boolean`
- Default: `true`

Whether to bypass looking for `@flow` pragma comment before parsing

### options.ignoreUninitializedFields

- Type: `boolean`

Whether to remove uninitialized class fields completely rather than only removing the type (defaults to false)

### options.removeEmptyImports

- Type: `boolean`
- Default: `true`

Whether to remove empty import statements which were only used for importing flow types (defaults to true)

## Example

```js title=rspack.config.cjs
const Repack = require("@callstack/repack");

module.exports = {
  module: {
    rules: [
      ...Repack.getFlowTransformRules({
        include: ["react-native", "@react-native"],
        all: true,
        ignoreUninitializedFields: false,
        removeEmptyImports: true,
      }),
    ],
  },
};
```
