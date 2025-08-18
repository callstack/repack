# BabelSwcLoader

The `BabelSwcLoader` combines Babel and SWC to speed up transformations while preserving compatibility with complex Babel setups. It:

- Runs Babel first to apply your project Babel config (minus transforms that SWC can handle)
- Detects supported Babel transforms and re-applies them via SWC for performance
- Optionally uses SWC for module lazy loading and other optimizations

If SWC is not available in the environment, it falls back to pure Babel automatically.

:::details
This loader inspects your Babel config to partition transforms into SWC-supported buckets and configures `@rspack/core`/`@swc/core` accordingly. It also appends required Babel syntax plugins for `.ts/.tsx` sources.
:::

## Options

```ts
import type { TransformOptions } from "@babel/core";
import type { SwcLoaderOptions } from "@rspack/core";

type HermesParserOverrides = {
  babel?: boolean;
  flow?: "all" | "detect";
  reactRuntimeTarget?: "18" | "19";
  sourceType?: "module" | "script" | "unambiguous";
};

type HermesParserOptions = {
  hermesParserPath?: string;
  hermesParserOverrides?: HermesParserOverrides;
};

type BabelOverrides = TransformOptions;
type SwcOverrides = Omit<SwcLoaderOptions, "rspackExperiments">;

type BabelSwcLoaderOptions = {
  hideParallelModeWarning?: boolean;
  lazyImports?: boolean | string[];
  babelOverrides?: BabelOverrides;
  swcOverrides?: SwcOverrides;
} & HermesParserOptions;
```

### hideParallelModeWarning

- Type: `boolean`
- Default: `false`

Hide the warning about Rspack `experiments.parallelLoader` when the rule isn't marked `parallel: true`.

### lazyImports

- Type: `boolean | string[]`
- Default: `true`

Enables SWC's lazy import evaluation for faster startup. You can also provide an allowlist of module names.

### babelOverrides

- Type: `@babel/core` `TransformOptions`

Additional Babel options merged into the auto-detected project config for the current file.

### swcOverrides

- Type: `Omit<SwcLoaderOptions, 'rspackExperiments'>`

Additional SWC loader options merged after the loader's computed SWC configuration.

### hermesParserPath / hermesParserOverrides

Same as in [`BabelLoader`](/api/loaders/babel-loader#options).

## Behavior details

- Automatically disables source maps for `node_modules` and enables them for app sources.
- Detects Babel plugins in your project config, filters out ones supported by SWC, and re-applies them using SWC for performance.
- Always includes Babel syntax plugins for `.ts`/`.tsx` files to match React Native expectations.
- If SWC can't be resolved (via Rspack experiments or `@swc/core`), the loader uses pure Babel.

## Examples

```js title=rspack.config.cjs
module.exports = {
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        type: "javascript/auto",
        // Optional: speed up with parallel threads in Rspack
        // parallel: true,
        use: {
          loader: "@callstack/repack/babel-swc-loader",
          options: {
            lazyImports: true,
            babelOverrides: {
              presets: ["module:metro-react-native-babel-preset"],
              plugins: ["react-native-reanimated/plugin"],
            },
          },
        },
      },
    ],
  },
};
```

:::tip
If you're already using `getJsTransformRules`, you typically don't need to add this loader manually. Use `BabelSwcLoader` if you want a hybrid Babel+SWC pipeline while keeping your existing Babel config.
:::

