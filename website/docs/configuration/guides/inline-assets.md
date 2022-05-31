# Inline Assets

By default, Re.Pack's [Assets loader](/docs/configuration/loaders/assets-loader) is configured to allow to import an asset and output it as as static file in `assets/` or `drawable-*` directories, similarly to Metro.
In some cases, you might want to change that behaviour and inline the assets into the JavaScript bundle. 

Common examples of such use case are:
- Out-of-tree platforms that don't support static assets in a similar way as Metro or don't support static assets at all.
- [Code splitting](../../code-splitting/usage) with static assets used by [remote chunks](../../code-splitting/glossary#remote-chunks)

## Usage

To inline assets you have to pass `inline` option to the [Assets loader](/docs/configuration/loaders/assets-loader).

As a result, the assets will be inlined into the JavaScript bundle in the following format:

```js
module.exports = { uri: 'data:<mediatype>;<base64_content>' };
```

:::info

If you're using [Code Splitting](#) or [Module Federation](#), all assets inlined into remote chunks or containers will be available to the host application and should be properly rendered.

:::

To use the inlined image simply import it or use `require` function:

```jsx
import image from './image.png';
<Image source={image} />
// or
<Image source={require('./image.png')} />
```

:::tip

You can also mix inlined assets (by  [Assets loader](#)),  regular assets (by  [Assets loader](#)) as well as [Assets Modules](https://webpack.js.org/guides/asset-modules/) (e.g: `assets/inline`) by adding multiple rules to process assets in different ways.

Use [`include`](https://webpack.js.org/configuration/module/#ruleinclude) and [`exclude`](https://webpack.js.org/configuration/module/#ruleexclude) to configure each rule.

:::
