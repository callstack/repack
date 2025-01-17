# ReactRefreshLoader

The `ReactRefreshLoader` is a fallback loader for Webpack that provides React Refresh functionality, mimicking the behavior of Rspack's built-in `builtin:react-refresh-loader`.

## Example

```js title=webpack.config.cjs
module.exports = {
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: "@callstack/repack/react-refresh-loader",
        },
      },
    ],
  },
};
```
