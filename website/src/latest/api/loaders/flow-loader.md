# FlowLoader

The `FlowLoader` removes Flow type annotations from JavaScript files, ensuring they can be processed by loaders that do not support Flow syntax. It should be positioned before other loaders (e.g. `builtin:swc-loader`) to prevent parsing errors when encountering Flow-specific code.

:::details
This loader uses `flow-remove-types` under the hood. You can learn more about it [here](https://github.com/facebook/flow/tree/main/packages/flow-remove-types).
:::

## Options

```ts
type FlowLoaderOptions = {
  all?: boolean;
  ignoreUninitializedFields?: boolean;
  pretty?: boolean;
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
