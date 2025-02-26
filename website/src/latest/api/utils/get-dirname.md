# getDirname

Convert a `file:///` URL to an absolute directory path. This utility is particularly useful in ESM Rspack/webpack configs where `__dirname` is not available.

## Parameters

```ts
type GetDirname = (fileUrl: string) => string;
```

### fileUrl

- Type: `string`
- Required: `true`

The `file:///` URL of a module, typically obtained from `import.meta.url`.

## Example

```js title=rspack.config.mjs
import * as Repack from "@callstack/repack";

export default (env) => {
  const { context = Repack.getDirname(import.meta.url) } = env;

  return {
    // ... config
  };
};
```
