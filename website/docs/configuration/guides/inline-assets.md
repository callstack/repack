# Inline Assets

By default, Re.Pack's [Assets loader](/docs/configuration/loaders/assets-loader) is configured to allow you to use assets in a normal way.
This is not the case when it comes to the remote chunks that use assets which are not available in the main app. In this scenario remote chunk must have `inlined assets`.

## Pre-requisites

To inline assets you have to pass `inline` option to the [Assets loader](/docs/configuration/loaders/assets-loader).

As a result we will get assets in the form of:

```js
// remote.chunk.bundle.js
// ...
module.exports = { uri: 'base64string' };
```

_Asset will be available in the chunk because it has been embedded into it._

That being the case we can pass require statement directly to the `source` prop of `Image` component like so:

```jsx
// App.js
// ...
<Image source={require('./assets/image.png')} />
```

:::tip

When your code or code that you are using uses `uri` key then you can just use webpack's `assets/inline` and tweak `exclude` and `include` options in both loaders.
