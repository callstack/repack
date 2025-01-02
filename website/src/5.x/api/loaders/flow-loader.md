# FlowLoader

The `FlowLoader` is used for stripping the flow types from the JS files. It should run before other loaders like `builtin:swc-loader` which don't support JS with Flow typings

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

| Name                      | Description                                                                                                         | Default |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------- |
| all                       | If true, bypasses looking for an `@flow` pragma comment before parsing.                                             | false   |
| ignoreUninitializedFields | If true, removes uninitialized class fields (`foo;`, `foo: string;`) completely rather than only removing the type. | false   |
| pretty                    | If true, removes types completely rather than replacing with spaces. This may require using source maps.            | false   |

## Example

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
