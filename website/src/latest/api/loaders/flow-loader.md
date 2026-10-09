# FlowLoader

The `FlowLoader` removes Flow type annotations from JavaScript files, ensuring they can be processed by loaders that do not support Flow syntax. It should be positioned before other loaders (e.g. `builtin:swc-loader`) to prevent parsing errors when encountering Flow-specific code.

:::details
Most files go through `flow-remove-types`. You can learn more about it [here](https://github.com/facebook/flow/tree/main/packages/flow-remove-types).

`flow-remove-types` only erases type annotations, so files using Flow `component` and `hook` declarations, enums or `match` expressions (React Native ships them since 0.81) are compiled with the React Native parser from your project's `@react-native/babel-preset` (`hermes-parser` or `flow-parser`) and `@babel/plugin-transform-flow-strip-types` instead. This requires `@react-native/babel-preset` and `@babel/core`, which React Native projects already have. Flow enums are lowered to [`flow-enums-runtime`](https://www.npmjs.com/package/flow-enums-runtime), resolved from your project or from `react-native`. `component` declarations are lowered for the React version installed in your project: `ref` becomes a regular prop on React 19 and `forwardRef` is used on React 18.
:::

## Options

```ts
type FlowLoaderOptions = {
  all?: boolean;
  ignoreUninitializedFields?: boolean;
  pretty?: boolean;
  removeEmptyImports?: boolean;
};
```

### all

- Type: `boolean`
- Default: `false`

If true, bypasses looking for an `@flow` pragma comment before parsing.

### ignoreUninitializedFields

- Type: `boolean`
- Default: `false`

If true, removes uninitialized class fields (`foo;`, `foo: string;`) completely rather than only removing the type.

### pretty

- Type: `boolean`
- Default: `false`

If true, removes types completely rather than replacing with spaces. This may require using source maps.

### removeEmptyImports

- Type: `boolean`
- Default: `true`

If true, removes empty import statements (`import {} from 'flow-typed-module';`) which were only used for importing flow types.

## Example

:::info
`flow-loader` is automatically applied thanks to [`getJsTransformRules`](/api/utils/get-js-transform-rules) helper that is included by default in Re.Pack v5 configuration and its preset for most common libraries.
:::

```js title=rspack.config.cjs
module.exports = {
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        use: {
          loader: "@callstack/repack/flow-loader",
          options: { all: true },
        },
        type: "javascript/auto",
      },
    ],
  },
};
```
