# getSwcLoaderOptions

A helper function that creates SWC loader configuration options optimized for React Native bundling.

:::info
This helper function is a part of [`getJsTransformRules`](/api/utils/get-js-transform-rules).
:::

## Parameters

```ts
interface MakeSwcLoaderConfigOptions {
  syntax: "js" | "ts";
  jsx: boolean;
  externalHelpers?: boolean;
  jsxRuntime?: "automatic" | "classic";
  disableImportExportTransform?: boolean;
  importSource?: string;
  lazyImports?: boolean | string[];
}
```

### options

- Required: `true`

Configuration options for SWC loader.

### options.syntax

- Type: `"js" | "ts"`
- Required: `true`

The source code syntax type.

### options.jsx

- Type: `boolean`
- Required: `true`

Whether to enable JSX/TSX parsing and transformation.

### options.externalHelpers

- Type: `boolean`
- Default: `true`

Whether to use external helpers for transformations.

See [SWC `jsc.externalHelpers`](https://swc.rs/docs/configuration/compilation#jscexternalhelpers).

### options.jsxRuntime

- Type: `"automatic" | "classic"`
- Default: `"automatic"`

The JSX runtime to use - 'automatic' for React 17+ new JSX transform or 'classic' for traditional JSX transform.

See [SWC `jsc.transform.react.runtime`](https://swc.rs/docs/configuration/compilation#jsctransformreactruntime).

### options.disableImportExportTransform

- Type: `boolean`
- Default: `false`

Whether to disable transformation of `import`/`export` statements.

### options.importSource

- Type: `string`
- Default: `"react"`

The source module for JSX runtime imports.

See [SWC `jsc.transform.react.importSource`](https://swc.rs/docs/configuration/compilation#jsctransformreactimportsource).

### options.lazyImports

- Type: `boolean | string[]`
- Default: `false`

Enable lazy loading for all imports or specific modules.

See [SWC `module.lazy`](https://swc.rs/docs/configuration/modules#lazy).

## Example

```js title=rspack.config.cjs
const Repack = require("@callstack/repack");

module.exports = {
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: "builtin:swc-loader",
          options: Repack.getSwcLoaderOptions({
            syntax: "ts",
            jsx: true,
            jsxRuntime: "automatic",
            externalHelpers: true,
          }),
        },
      },
    ],
  },
};
```
