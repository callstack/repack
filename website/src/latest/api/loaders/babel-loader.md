# BabelLoader

The `BabelLoader` runs Babel transformations for JavaScript and TypeScript sources in React Native projects. For JavaScript and Flow-typed files, it selects the parser used by your installed `@react-native/babel-preset`: `flow-parser` when declared by the preset, otherwise `hermes-parser` from the preset's syntax plugin. TypeScript and TSX files use Babel's standard parser.

:::info How this loader differs from babel-loader 

There are two similarly named loaders: `@callstack/repack/babel-loader` (this loader) and `babel-loader` from npm. This loader is tailored for Re.Pack and aims for Metro parity, so the same Babel config used in Metro works as-is in Re.Pack. It automatically selects the React Native parser for JS/JSX and Flow, and Babel's parser for TypeScript and TSX.

It is also optimized for parallel transforms. In Rspack, enable [`experiments.parallelLoader`](https://rspack.rs/config/experiments#experimentsparallelloader) to fan out transforms; in webpack, pair it with [`thread-loader`](https://www.npmjs.com/package/thread-loader) to run a worker pool. On projects with heavier Babel pipelines, this often translates into noticeably faster builds.

:::

## Options

```ts
// All Babel options from `@babel/core` are supported
type BabelTransformOptions = import('@babel/core').TransformOptions

type BabelLoaderOptions = BabelTransformOptions & {
  hermesParserPath?: string;
  hermesParserOverrides?: HermesParserOverrides;
};
```

All options from the [Babel options documentation](https://babeljs.io/docs/options) are supported. See [Babel TransformOptions](#babel-transformoptions) below for more details.


### hermesParserPath

- Type: `string`

Optional path to the React Native parser module. This overrides automatic parser selection, which resolves `@react-native/babel-preset` from Babel's `root` or `cwd` (falling back to `process.cwd()`) and uses the preset's parser dependencies. The option name is retained for backward compatibility and also applies to `flow-parser`.

### hermesParserOverrides

- Type: `HermesParserOverrides`
- Default: `{ babel: true, reactRuntimeTarget }`, where `reactRuntimeTarget` follows the project's `react` version (`'18'` before React 19, `'19'` otherwise)

Overrides passed to the selected React Native parser when parsing non-TypeScript files. The option name is retained for backward compatibility and also applies to `flow-parser`. Flow enums are lowered by the parser to [`flow-enums-runtime`](https://www.npmjs.com/package/flow-enums-runtime), resolved from your project or from `react-native`, because `@react-native/babel-preset` strips them before its enum plugin runs.

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

## Custom Babel rules

For custom rules using npm's `babel-loader`, add `@callstack/repack/babel-plugin-syntax-react-native` to the Babel `plugins` list to select the syntax parser used by the installed React Native preset. The plugin resolves the preset from the directory Babel supplies for the plugin configuration.

```js
plugins: ["@callstack/repack/babel-plugin-syntax-react-native"]
```

Re.Pack's `getCodegenTransformRules()` and Reanimated plugin already include this syntax plugin automatically.

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
