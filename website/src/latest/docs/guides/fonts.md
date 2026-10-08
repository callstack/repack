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

In Android release builds, fonts bundled by Re.Pack are available as `font` resources, named after their path in the project (e.g. `assets/fonts/Inter.ttf` becomes `assets_fonts_inter`). You can register them in `MainApplication` with `ReactFontManager`:

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
