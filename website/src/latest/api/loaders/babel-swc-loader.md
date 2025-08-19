# BabelSwcLoader

The `BabelSwcLoader` pairs Babel with SWC to deliver faster builds without sacrificing compatibility with complex Babel setups. It first runs Babel to respect your project’s configuration, then hands off the supported transforms to SWC.

This loader can be used universally—even if your project does not have SWC. When SWC isn’t available, it cleanly falls back to pure Babel transforms, so you can adopt it incrementally without extra setup.
SWC can be provided either by Rspack (via its built-in integration) or by installing `@swc/core` in your project.

:::danger Heads up!
Do not use `@callstack/repack/babel-swc-loader` together with `getJSTransformRules`. They overlap in functionality and will duplicate transforms when combined in one configuration. It might often result in code that's malformed and won't execute properly in the target mobile environment.
:::

:::tip Maximizing performance
For optimal performance, enable Rspack’s parallel transforms with [`experiments.parallelLoader`](https://rspack.rs/config/experiments#experimentsparallelloader). This allows for transformations to run in parallel through worker threads managed by Rspack.
:::

:::details How does this loader work?
The loader reads your Babel config and checks each plugin against a capability map to see if SWC can produce the same semantics. From that, it builds two ordered sets: transforms that stay in Babel and transforms handed off to SWC. This preserves your original plugin order and avoids behavior changes.

Babel runs first and executes only the Babel‑only pieces while adding the minimal syntax support your sources need (for example, TS/TSX and Hermes‑compatible parsing where applicable). SWC then runs on the result with a generated configuration (including targets and optional lazy imports) and applies its share of the work. Each transform is applied once—never duplicated—and the output matches what you’d get from Babel alone. 

If SWC isn’t available, the SWC step is skipped and Babel handles everything.
:::

## Options

```ts
import type { TransformOptions } from "@babel/core";
import type { Options } from "@swc/core";

type BabelOverrides = TransformOptions;
type SwcOverrides = Options;

type BabelSwcLoaderOptions = {
  hideParallelModeWarning?: boolean;
  lazyImports?: boolean | string[];
  babelOverrides?: BabelOverrides;
  swcOverrides?: SwcOverrides;
  hermesParserPath?: string;
  hermesParserOverrides?: {
    babel?: boolean;
    flow?: "all" | "detect";
    reactRuntimeTarget?: "18" | "19";
    sourceType?: "module" | "script" | "unambiguous";
  };
};
```

### lazyImports

- Type: `boolean | string[]`
- Default: `true`

Enables SWC's lazy import functionality, which is roughly equivalent to Metro's `inlineRequires`. You can also provide an allowlist of module names. See [SWC documentation](https://swc.rs/docs/configuration/modules#lazy) for details on how to configure it.

### babelOverrides

- Type: `BabelOverrides`

```ts
type BabelOverrides = import('@babel/core').TransformOptions
```

Additional Babel loader options applied on top of the loader's computed Babel configuration. For available fields, see [Babel Documentation](https://babeljs.io/docs/options).

### swcOverrides

- Type: `SwcOverrides`

```ts
type SwcOverrides = import('@swc/core').Options
```

Additional SWC loader options applied on top of the loader's computed SWC configuration. For available fields, see [SWC Documentation](https://swc.rs/docs/configuration/swcrc).

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

### hideParallelModeWarning

- Type: `boolean`
- Default: `false`

Hide the warning about Rspack `experiments.parallelLoader` when the rule isn't marked `parallel: true`.

## Example

```js title=rspack.config.mjs
export default {
  module: {
    rules: [
      {
        test: /\.[cm]?[jt]sx?$/,
        type: "javascript/auto",
        use: {
          loader: "@callstack/repack/babel-swc-loader",
          parallel: true,
          options: {
            lazyImports: true,
          },
        },
      },
    ],
  },
};
```

