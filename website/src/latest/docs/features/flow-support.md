# Flow support

:::note Rspack users
Since SWC doesn't currently support Flow, we use a dedicated loader to strip Flow types in Rspack. With webpack, Flow support is implemented using the same set of Babel plugins as Metro.
:::

Re.Pack 5 includes support for Flow language via dedicated loaders that remove Flow type annotations from the code.

## Usage with codebase

To use Flow language in your project, you need to setup [`flow-loader`](/api/loaders/flow-loader.md) in your Rspack configuration.

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
        include: [
          // Paths to include
        ],
      },
    ],
  },
};
```

To see the full list of options available, please refer to the [flow-loader documentation](/api/loaders/flow-loader.md#options).

## Usage with libraries

Re.Pack also includes list of popular React Native libraries that ships with Flow type annotations and automatically strips annotations from them.
Here's the list of libraries that are [supported](https://github.com/callstack/repack/blob/07b2e2059487f0b6962b05016e7f1453ba35c379/packages/repack/src/rules/flowTypedModulesLoadingRules.ts#L12).

:::info Contributing
If you're using a Flow-typed library that's not on our list, please consider opening an issue or submitting a PR!
:::

However if you are using a library that is not in the list, you can add it to the list by using the following configuration:

```js title=rspack.config.cjs
import { getModulePaths } from '@callstack/repack/utils';

module.exports = {
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        include: getModulePaths([
          'library-name',
        ]),
        use: {
          loader: '@callstack/repack/flow-loader',
          options: { all: true },
        },
        type: 'javascript/auto',
      },
    ],
  },
};
```

:::note TypeScript vs Flow
Flow is not a commonly used solution in the React Native ecosystem, with TypeScript being the default and recommended choice for type checking. We maintain Flow support primarily for legacy codebases, libraries, and specific use cases where Flow is still required.
:::