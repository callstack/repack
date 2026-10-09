# Using custom fonts

Font files (`ttf` and `otf`) are processed by the [Assets loader](/api/loaders/assets-loader) like any other asset, so you can `require` or `import` them from JavaScript. How you load the font afterwards depends on whether it is used by a JavaScript library or by native `<Text>` components.

## Loading fonts from JavaScript

Libraries that load fonts at runtime from an asset reference, such as [React Native Skia](https://shopify.github.io/react-native-skia/), work without any additional configuration:

```jsx
import { useFont } from '@shopify/react-native-skia';

const font = useFont(require('./assets/fonts/Inter.ttf'), 24);
```

In development, the font is served by the development server. In release builds on Android, Re.Pack emits the font to both the `font` and `raw` resource directories and generates a `raw/keep.xml` file, so the font can be found by name and is kept when resource shrinking (`shrinkResources`) is enabled. See [Android resource directories](/api/loaders/assets-loader#android-resource-directories) for details.

## Using fonts in native `<Text>` components

Requiring a font file doesn't register it with the platform, so it can't be used with the `fontFamily` style yet. This is the same as with Metro. Use one of the following approaches.

### Link fonts natively (recommended)

Add the font files to the native projects so they are available in both debug and release builds:

- **Android**: place the files in `android/app/src/main/assets/fonts/`. The file name (without extension) becomes the `fontFamily` value.
- **iOS**: add the files to your app target in Xcode and list them under `UIAppFonts` in `Info.plist`. The font's family name becomes the `fontFamily` value.

```jsx
<Text style={{ fontFamily: 'Inter' }}>Hello</Text>
```

### Register fonts emitted by Re.Pack (Android release builds)

In Android release builds, fonts bundled by Re.Pack are available as `font` resources. A font is only bundled if it is `require`d or `import`ed somewhere in your JavaScript code. The resource name comes from the font's path relative to the project root, not to the file that requires it (e.g. `assets/fonts/Inter.ttf` becomes `assets_fonts_inter`). You can register these fonts in `MainApplication` with `ReactFontManager`:

```js title="index.js"
// makes Re.Pack bundle the font, even if it's only used by native <Text>
require('./assets/fonts/Inter.ttf');
```

```kotlin title="MainApplication.kt"
import com.facebook.react.common.assets.ReactFontManager

override fun onCreate() {
  super.onCreate()
  loadReactNative(this)

  val fontId = resources.getIdentifier("assets_fonts_inter", "font", packageName)
  if (fontId != 0) {
    ReactFontManager.getInstance().addCustomFont(this, "Inter", fontId)
  }
}
```

:::warning Release builds only
When using the development server, fonts are served over HTTP and are not part of the Android resources, so the resource lookup above returns `0` and the font falls back to the system font. Link the font natively if you need it in debug builds as well.

The lookup also returns `0` in release builds if the font isn't required from JavaScript. Because of the `fontId != 0` check, this fails silently and the text uses the system font.
:::

## Font collections (`.ttc`)

`ttc` files are not included in the default [asset extensions](/api/utils/constants#asset_extensions). To use them, add a rule that processes them with the Assets loader:

```js title="rspack.config.cjs"
const Repack = require('@callstack/repack');

module.exports = {
  module: {
    rules: [
      ...Repack.getAssetTransformRules(),
      {
        test: /\.ttc$/,
        use: '@callstack/repack/assets-loader',
      },
    ],
  },
};
```

This is enough for libraries that load fonts from JavaScript, such as React Native Skia. Native `<Text>` on Android only looks up `.ttf` and `.otf` files in `assets/fonts/`, so a `.ttc` file can't be linked natively there. In Android release builds, you can still register the `font` resource emitted by Re.Pack with [`addCustomFont`](#register-fonts-emitted-by-repack-android-release-builds).
