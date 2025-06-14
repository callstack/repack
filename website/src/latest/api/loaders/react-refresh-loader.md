# ReactRefreshLoader

The `ReactRefreshLoader` enables [React Fast Refresh](https://reactnative.dev/docs/fast-refresh) for React components in React Native applications.

:::info
This loader is automatically added to your configuration when Hot Module Replacement (HMR) is enabled. By default, it's configured to process all JavaScript and TypeScript files outside of the `node_modules` directory. You don't need to add it manually to your configuration unless you need to enable React Refresh for some of the node modules.
:::

:::details
The loader works similarly to Rspack's `builtin:react-refresh-loader` from `@rspack/plugin-react-refresh`, but is specifically tailored to account for React Native runtime specifics. It appends necessary runtime code to register and refresh React components, ensuring proper HMR functionality in a React Native environment.
:::

## Example

```js title=rspack.config.cjs
module.exports = {
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        include: [/node_modules\/react-native/],
        use: {
          loader: "@callstack/repack/react-refresh-loader",
        },
      },
    ],
  },
};
```
