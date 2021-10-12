# Usage

The specific implementation of Code Splitting in your application can be different and should account for your project's specific needs, requirements and limitations.

In general, we can identify 3 main categories of implementation. All of those approaches are based on the same underlying mechanism: Re.Pack's [`ChunkManager API`](../api/react-native/classes/ChunkManager) and the native module for it.

:::caution

Because Code Splitting support is based on the native module, you need to be able to compile the native code in your project, meaning you cannot use it with Expo. 

It might be possible to use it in an ejected Expo app, but that scenario is not officially supported.

:::

:::tip

Use [Glossary of terms](./glossary) to better understand the content of this documentation.

:::

## Generic usage

TODO

## Approaches

There are generally 3 approaches to Code Splitting with Webpack and Re.Pack. Keep in mind that the
actual code you will have to create might be slightly different, depending on your project's
requirements, needs and limitations.

Those approaches should be used as a base for your Code Splitting implementation.

:::tip

It's recommended to read [Generic usage](#generic-usage) first, to understand it on a high-level and
get the necessary context.

:::

### Async chunks

Async chunks (or asynchronous chunks) are the easiest Code Splitting approach. They are usually
created by using dynamic `import(...)` function, which makes them extremely easy to introduce it
into the codebase.

The async chunks are created alongside the main bundle as part of a single
Webpack compilation, making it a great choice for a modular applications where all the code is
developed in-house.

The usage of async chunks essentially boils down to calling `import(...)` in your code, for example:

```js
const myChunk = await import('./myChunk.js');
```

Async chunks created by dynamic `import(...)` function can be nicely integrated using `React.lazy`
and `React.Suspense`:

```jsx
// MyChunk.js
export default function MyChunk(props) {
  return /* ... */;
}

// App.js
const MyChunk = React.lazy(() => import('./MyChunk.js'));

function App() {
  return (
    <React.Suspense fallback={<Text>Loading...</Text>}>
      <MyChunk /* someProp="someValue" */ />
    </React.Suspense>
  );
}
```

:::tip

To learn more or use async chunks in your project, check out our [dedicated Async chunks guide](./guide-async-chunks).

:::

:::tip

To see `import(...)`, `React.lazy` and `React.Suspense` in action, check out
[Re.Pack's `TesterApp`](https://github.com/callstack/repack/blob/main/packages/TesterApp/src/AsyncContainer.js).

:::

:::info

For production, don't forget to configure Re.Pack's [`ChunkManager`](../api/react-native/classes/ChunkManager).

:::

### Scripts

This approach allows to execute arbitrary code in your React Native application.
It's a similar concept as adding a new `<script>` element to a Web page.

Those scripts can be written in-house or externally, bundled using Webpack or a different bundler.
This also means that scripts can be created as part of separate Webpack compilations, or separate
build pipelines, from separate codebases and repositories.

:::warning

Scripts should only be used by advanced users with deep Webpack knowledge and experience.

Scripts give a lot of flexibility but it also means the support for them is only limited the
[`ChunkManager`](../api/react-native/classes/ChunkManager) API. It's not possible for Re.Pack's
contributors to support all potential setups using this approach.

:::

:::caution

Beware, with dynamic scripts **there's no dependency sharing by default**. If you want your scripts
to reuse existing dependencies from the main bundle, it's up to you to figure out how to do it.
A good starting point would be:

- https://webpack.js.org/configuration/externals/
- https://webpack.js.org/plugins/dll-plugin/

:::

Loading a script is as simple as running a single function:

```js
await ChunkManager.loadChunk('my-script');
console.log('Script loaded');
```

And configuring the [`ChunkManager`](../api/react-native/classes/ChunkManager) to resolve your
scripts:

```js
ChunkManager.configure({
  forceRemoteChunkResolution: true,
  resolveRemoteChunk: async (chunkId) => {
    if (chunkId === 'my-script') {
      return {
        url: `https://my-domain.dev/my-script.js`,
        excludeExtension: true,
      };
    }

    throw new Error(`Chunk ${chunkId} not supported`);
  },
});
```

### Module Federation

The Module Federation approach allows to create micro frontends, which are built using
separate/dedicated Webpack compilations from the same (monorepo) or different codebases.

Each micro frontend can be developed in isolation as a standalone application, but in production all
of them will work together and act as a single entity.

To get more information and better understand what Module Federation is, use the following resources:

- https://medium.com/swlh/webpack-5-module-federation-a-game-changer-to-javascript-architecture-bcdd30e02669
- https://webpack.js.org/concepts/module-federation/
- https://github.com/module-federation/module-federation-examples

:::caution

Given the nature of React Native environment, which needs to be initialized at the very beginning to
be usable, Module Federation gets limited to only a few scenarios. The best one showcasing how it
could work in React Native is
[`dynamic-system-host`](https://github.com/module-federation/module-federation-examples/tree/master/dynamic-system-host).

:::

:::caution

The support for [Module Federation](https://webpack.js.org/concepts/module-federation/) in Re.Pack
is still **work in progress and not official yet**.

Initial investigation yielded promising results. Feel free to experiment with it using this example:
https://github.com/zamotany/module-federation-repack.

:::