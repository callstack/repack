# BabelLoader

The `BabelLoader` runs Babel transformations for JavaScript and TypeScript sources in React Native projects. It chooses the parser based on source type: `hermes-parser` for JavaScript and Flow-typed files, and Babel's standard parser for TypeScript files.

:::info How this loader differs from babel-loader 

There are two similarly named loaders: `@callstack/repack/babel-loader` (this loader) and `babel-loader` from npm. This loader is tailored for Re.Pack and aims for Metro parity, so the same Babel config used in Metro works as-is in Re.Pack. It automatically selects the parser by source type (Hermes parser for JS/JSX and Flow, Babel parser for TypeScript).

It is also optimized for parallel transforms. In Rspack, enable [`experiments.parallelLoader`](https://rspack.rs/config/experiments#experimentsparallelloader) to fan out transforms; in webpack, pair it with [`thread-loader`](https://www.npmjs.com/package/thread-loader) to run a worker pool. On projects with heavier Babel pipelines, this often translates into noticeably faster builds.

:::

## Options

```ts
// All Babel options from `@babel/core` are supported
type BabelTransformOptions = import('@babel/core').TransformOptions

type BabelLoaderOptions = BabelTransformOptions & {
  babel?: boolean;
  flow?: "all" | "detect";
  reactRuntimeTarget?: "18" | "19";
  sourceType?: "module" | "script" | "unambiguous";
};
```

All options from the [Babel options documentation](https://babeljs.io/docs/options) are supported. See [Babel TransformOptions](#babel-transformoptions) below for more details.


### hermesParserPath

- Type: `string`

Optional path to use for importing `hermes-parser`. By default, the path is obtained automatically.

### hermesParserOverrides

- Type: `HermesParserOverrides`
- Default: `{ babel: true, reactRuntimeTarget: '19' }`

Overrides passed to `hermes-parser` when parsing non-TypeScript files.

```ts
type HermesParserOverrides = {
  babel?: boolean;
  flow?: "all" | "detect";
  reactRuntimeTarget?: "18" | "19";
  sourceType?: "module" | "script" | "unambiguous";
};
```

## Babel TransformOptions

You can pass any standard Babel options (e.g. `presets`, `plugins`, `overrides`, etc.). Source maps are enabled automatically for application code and disabled for `node_modules` by default.

## Example

```js title=rspack.config.mjs
export default {
  module: {
    rules: [
      {
        test: /\.[cm]?[jt]sx?$/,
        type: "javascript/auto",
        use: {
          loader: "@callstack/repack/babel-loader",
          options: {
            presets: ["module:@react-native/babel-preset"],
            plugins: ["react-native-reanimated/plugin"],
            comments: true
          },
        },
      },
    ],
  },
};
```

