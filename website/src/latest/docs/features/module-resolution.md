# Module resolution

Module resolution is the process by which a bundler determines which file to load when you import a module. In React Native, this process has unique requirements—platform-specific files, scaled assets, and the `react-native` condition in package exports all need special handling.

Re.Pack is designed to match [Metro's resolution behavior](https://metrobundler.dev/docs/resolution) as closely as possible, ensuring that projects migrating from Metro or using libraries designed for Metro work correctly.

Getting module resolution right ensures that:

- Platform-specific files (`.ios.js`, `.android.js`) load correctly for each target
- Libraries with React Native-specific entry points work as expected
- Scaled assets (`@2x`, `@3x` images) resolve properly

## How Re.Pack resolves modules

Re.Pack configures the underlying bundler's resolver to match Metro's behavior. When using Rspack, resolution is handled by [rspack-resolver](https://github.com/unrs/rspack-resolver)—a Rust port of [enhanced-resolve](https://github.com/webpack/enhanced-resolve) with the same interface. When using webpack, the original enhanced-resolve is used.

The [`getResolveOptions()`](/api/utils/get-resolve-options) utility returns the configuration needed to match Metro's resolution behavior:

```ts
import * as Repack from "@callstack/repack";

export default (env) => {
  return {
    resolve: {
      ...Repack.getResolveOptions(),
    },
  };
};
```

Resolution happens per-platform—each build (iOS, Android, etc.) runs as a separate bundler process with platform-specific resolution configured automatically based on the target platform.

## Platform-specific resolution

React Native allows you to create platform-specific versions of files using special extensions. Re.Pack resolves these extensions in the following order:

1. `.{platform}.{ext}` (e.g., `.ios.js`, `.android.js`)
2. `.native.{ext}` (when `preferNativePlatform: true`, which is the default)
3. `.{ext}` (base extension)

### Example

Given a request for `./component` on iOS, Re.Pack will look for files in this order:

```
component.ios.js    → Platform-specific (highest priority)
component.native.js → Native fallback
component.js        → Base file (lowest priority)
```

The same request on Android:

```
component.android.js → Platform-specific (highest priority)
component.native.js  → Native fallback
component.js         → Base file (lowest priority)
```

### Supported source extensions

Re.Pack supports these source file extensions by default:

- `.js`, `.jsx`
- `.ts`, `.tsx`
- `.json`

Each of these can be combined with platform and native extensions:

```
.ios.js, .ios.jsx, .ios.ts, .ios.tsx, .ios.json
.native.js, .native.jsx, .native.ts, .native.tsx, .native.json
.android.js, .android.jsx, .android.ts, .android.tsx, .android.json
```

### Disabling native extension fallback

If you don't want `.native.*` files to be resolved as fallbacks, set `preferNativePlatform` to `false`:

```ts
Repack.getResolveOptions({
  preferNativePlatform: false,
});
```

:::tip

This is useful when building for non-native platforms (like web) where `.native.*` files might contain React Native-specific code that won't work in a browser.

:::

With this setting, a request for `./component` on a `web` platform would only check:

```
component.web.js → Platform-specific
component.js     → Base file (no .native.js fallback)
```

## Package resolution (main fields)

:::info What are main fields?

Main fields are `package.json` properties that point to a package's entry file. Packages can specify different entry points for different environments—`main` for Node.js, `browser` for web, `react-native` for React Native.

:::

When resolving a package's entry point, Re.Pack checks these fields in `package.json` in order:

1. `react-native` — React Native-specific entry point
2. `browser` — Browser-compatible entry point
3. `main` — Standard Node.js entry point

This matches Metro's default configuration and ensures React Native-optimized code is preferred.

### Example

Given this `package.json`:

```json
{
  "name": "some-library",
  "main": "lib/index.js",
  "browser": "lib/browser.js",
  "react-native": "lib/native.js"
}
```

Re.Pack will resolve to `lib/native.js` because `react-native` has the highest priority.

:::tip

For more details on how main fields work, see the [resolve.mainFields](https://rspack.dev/config/resolve#resolvemainfields) documentation.

:::

## Package exports (conditional exports)

:::info What are package exports?

Package exports (`exports` field in `package.json`) are a modern replacement for main fields. They let packages define multiple entry points (e.g., `pkg/utils`), serve different code per environment, and hide internal files. See the [Node.js docs](https://nodejs.org/api/packages.html#package-entry-points) for details.

:::

Modern packages use the `exports` field in `package.json` to define entry points with conditions. Re.Pack supports this through the `enablePackageExports` option.

:::caution

Package exports support is **disabled by default** (`enablePackageExports: false`) to maintain backwards compatibility with existing React Native projects. Enable it explicitly if your dependencies require it.

:::

### Enabling package exports

```ts
Repack.getResolveOptions({
  enablePackageExports: true,
});
```

### How conditional exports work

When enabled, Re.Pack uses the `react-native` condition to resolve packages. The resolver also differentiates between ESM and CommonJS:

- **ESM imports**: Uses conditions `['react-native', 'import']`
- **CommonJS requires**: Uses conditions `['react-native', 'require']`

:::tip

These ESM/CJS conditions are always configured (via `byDependency`) to support [package imports](https://nodejs.org/api/packages.html#subpath-imports), even when `enablePackageExports` is `false`.

:::

### Example package with exports

```json
{
  "name": "modern-library",
  "exports": {
    ".": {
      "react-native": "./dist/native/index.js",
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js",
      "default": "./dist/index.js"
    },
    "./utils": {
      "react-native": "./dist/native/utils.js",
      "import": "./dist/esm/utils.js",
      "require": "./dist/cjs/utils.js"
    }
  }
}
```

With `enablePackageExports: true`, importing this package in React Native will resolve to the `react-native` condition entry points.

:::warning

Some packages may have `exports` configurations that work differently than their `main`/`react-native` field configurations. Test thoroughly when enabling this option in existing projects.

:::

## Asset resolution

Re.Pack handles scaled assets (images with `@1x`, `@2x`, `@3x` suffixes) automatically using `extensionAlias` configuration.

### Supported scalable assets

Images that support resolution scaling:

- `bmp`, `gif`, `jpg`, `jpeg`, `png`, `psd`, `svg`, `webp`, `tiff`

### How scaled resolution works

When you import an image like `./icon.png`, Re.Pack's `extensionAlias` configuration allows the resolver to find scaled variants:

```
icon@0.75x.png
icon@1x.png
icon@1.5x.png
icon@2x.png
icon@3x.png
icon@4x.png
icon.png
```

The actual asset selection (choosing the right scale for the device) happens at runtime through React Native's asset system.

```jsx
// Import resolves to the appropriate scaled variant
import icon from './assets/icon.png';

// React Native selects the correct scale at runtime
<Image source={icon} />
```

### Other supported asset types

Re.Pack also supports these non-scalable asset types:

- **Video**: `m4v`, `mov`, `mp4`, `mpeg`, `mpg`, `webm`
- **Audio**: `aac`, `aiff`, `caf`, `m4a`, `mp3`, `wav`
- **Documents**: `html`, `pdf`, `yaml`, `yml`
- **Fonts**: `otf`, `ttf`
- **Other**: `zip`, `obj`

## Troubleshooting

Most resolution issues can be solved with two configuration options:

- **`resolve.alias`** — Redirect imports to a different module or file
- **`module.rules`** — Control how specific modules are processed

```ts
export default (env) => {
  return {
    resolve: {
      alias: {
        // Redirect problematic package to a compatible version
        'legacy-package': 'legacy-package/dist/react-native',
      },
    },
    module: {
      rules: [
        {
          // Force specific files through a loader
          test: /problematic-module/,
          use: 'babel-loader',
        },
      ],
    },
  };
};
```

### Package not resolving correctly

1. **Check the package's `package.json`** — Look at `main`, `react-native`, `browser`, and `exports` fields
2. **Verify platform extensions** — Ensure platform-specific files use correct naming (`.ios.js`, not `.iOS.js`)
3. **Check `enablePackageExports`** — Some modern packages require this to be `true`

### Platform-specific files not being picked up

1. **Verify file naming** — Extensions must be lowercase (`.ios.js`, not `.IOS.js`)
2. **Check the platform value** — Ensure you're building for the correct target platform
3. **Inspect resolve configuration** — Log the output of `getResolveOptions()` to verify extensions order

### Package exports compatibility issues

When enabling `enablePackageExports`, some packages may resolve differently:

1. **Compare with Metro** — Test the same import in a Metro-bundled project
2. **Check condition order** — The `react-native` condition should take precedence
3. **Inspect the package** — Some packages have incorrect or incomplete `exports` configurations

## Related documentation

- [getResolveOptions](/api/utils/get-resolve-options) — API reference
- [Rspack resolve configuration](https://rspack.dev/config/resolve) — Rspack resolver options
- [webpack resolve configuration](https://webpack.js.org/configuration/resolve/) — webpack resolver options
- [Code Splitting](/docs/features/code-splitting) — For chunk resolution
- [Glossary](/docs/resources/glossary) — Terminology reference
