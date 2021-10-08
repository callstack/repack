# Code Splitting 

Code Splitting is a technique that splits the code into multiple bundles, which can be loaded on demand and in parallel.

It can be used to:
- Optimize the initial size of the application and to improve the startup performance by deferring
the parsing (only with JSC) and execution (JSC and Hermes) of the non-critical code.
- Dynamically deliver content and features to the users based on runtime factors: user's role, subscription plan, preferences etc.

Code Splitting is one of the most important features in Re.Pack, and it's based on Webpack's infrastructure as well as the native module
that allows to execute the additional code on the same JavaScript context (same React Native instance).

:::caution

Because Code Splitting support is based on the native module, you need to be able to compile the
native code yourself, meaning you cannot use it with Expo. 

It might be possible to use it in an ejected Expo app, but that scenario is not officially supported.

:::

## Approaches

There are essentially 3 approaches to Code Splitting with Webpack and Re.Pack:

### Async chunks

Usually created by using dynamic `import(...)` function, which makes it extremely easy to introduce
it into the codebase. The async chunks are created alongside the main bundle as part of a single
Webpack compilation, making it a great choice for a modular applications where all the code is developed
in-house.

```js
const myChunk = await import('./myChunk.js');
```

Async chunks created by dynamic `import(...)` function can be nicely integrated using `React.lazy`:

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

If you want to see `import(...)`, `React.lazy` and `React.Suspense` in action, checkout [Re.Pack's `TesterApp`](https://github.com/callstack/repack/blob/main/packages/TesterApp/src/AsyncContainer.js).

:::

:::info

For production, don't forget to configure Re.Pack's [`ChunkManager`](../api/react-native/classes/ChunkManager).

:::

### Scripts

This approach allows to execute arbitrary code in your React Native application.
It's a similar concept to as adding a new `<script>` element to your Web page.

Those scripts can be written in-house or externally and bundled using Webpack or a different bundler.
This also means that scripts can be created as part of separate Webpack compilations, or separate build pipelines,
from separate codebases and repositories.

:::warning

Scripts should only be used by advanced users with deep Webpack knowledge and experience.
**Our support for scripts approach is limited to the [`ChunkManager`](../api/react-native/classes/ChunkManager) API only.**

:::

:::caution

Beware, with dynamic scripts **there's no dependency sharing by default**. If you want your scripts
to reuse existing dependencies from the main bundle, it's up to you to figure out how to do it - you might want to look into:
  
- https://webpack.js.org/configuration/externals/
- https://webpack.js.org/plugins/dll-plugin/

:::

Loading script is as simple as running a single function:

```js
await ChunkManager.loadChunk('my-script');
console.log('Script loaded');
```

And configuring the [`ChunkManager`](../api/react-native/classes/ChunkManager) to resolve your scripts:

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

The Module Federation approach allows to create micro frontends, which are built using separate/dedicated Webpack compilations from different codebases.
Each micro frontend can be developed in isolation as a standalone application and it production all of them will work together and acting as a single entity.

You can read more here:

- https://medium.com/swlh/webpack-5-module-federation-a-game-changer-to-javascript-architecture-bcdd30e02669
- https://webpack.js.org/concepts/module-federation/
- https://github.com/module-federation/module-federation-examples

:::caution

Given the nature of React Native environment, which needs to be initialized at the very beginning to be usable,
Module Federation gets limited to only a few scenarios. The best one showcasing how it could work in React Native
is [`dynamic-system-host`](https://github.com/module-federation/module-federation-examples/tree/master/dynamic-system-host).

:::

:::caution

The support for [Module Federation](https://webpack.js.org/concepts/module-federation/) in Re.Pack is still **work in progress and not official yet**.

Initial investigation yielded promising results. Feel free to experiment with it using this example: https://github.com/zamotany/module-federation-repack.

:::

## Example: E-Learning application

Let's assume, we are building an E-Learning application with specific functionalities for a student 
and for a teacher. Both student and a teacher will get different UIs and different features, so it
would make sense to isolate the student's specific code from the teacher's. That's were Code Splitting comes into play - we
can use dynamic `import(...)` function together with `React.lazy` and `React.Suspense` to conditionally render
the student and the teacher sides based on the user's role.

:::tip

Before you begin, make sure the Re.Pack's native module is linked into your application:

- https://reactnative.dev/docs/linking-libraries-ios
- https://github.com/react-native-community/cli/blob/master/docs/autolinking.md

:::

### Source code

Let's use the following code for the student's side:

```jsx
// StudentSide.js
import * as React from 'react';
import { View, Text } from 'react-native';

export default function StudentSide({ user }) {
  return (
    <View style={{ flex: 1 }}>
      <Text>Hello {user.name}!</Text>
      <Text>You are a student.</Text>
      {/* ...more student related code */}
    </View>
  )
}
```

And a code for the teacher's side:

```jsx
// TeacherSide.js
import * as React from 'react';
import { View, Text } from 'react-native';

export default function TeacherSide({ user }) {
  return (
    <View style={{ flex: 1 }}>
      <Text>Hello {user.name}!</Text>
      <Text>You are a teacher.</Text>
      {/* ...more teacher related code */}
    </View>
  )
}
```

Now in our parent component, which will be common for both the student and the teacher:

```jsx
// Home.js
import * as React from 'react';
import { Text } from 'react-native';

const StudentSide = React.lazy(
  () => import(/* webpackChunkName: "student" */ './StudentSide.js')
);

const TeacherSide = React.lazy(
  () => import(/* webpackChunkName: "teacher" */ './TeacherSide.js')
);

export function Home({ user }) {
  const Side = React.useMemo(
    () => user.role === 'student'
      ? <StudentSide user={user} />
      : <TeacherSize user={user} />,
    [user]
  );

  return (
    <React.Suspense fallback={<Text>Loading...</Text>}>
      <Side />
    </React.Suspense>
  )
}
```

At this point all the code used by `StudentSide.js` will be put into `student.chunk.bundle` and
`TeacherSide.js` into `teacher.chunk.bundle`.

If you try to render `Home` component in your application, it should work in development (development server must be running).
For production however, there's an additional step necessary - configure [`ChunkManager`](../api/react-native/classes/ChunkManager):

```js
// index.js
import { AppRegistry } from 'react-native';
import { ChunkManager } from '@callstack/repack/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from './src/App'; // Your application's root component
import { name as appName } from './app.json';

ChunkManager.configure({
  storage: AsyncStorage, // optional
  resolveRemoteChunk: async (chunkId) => {
    // Feel free to use any kind of remote config solution to obtain
    // a base URL for the chunks, if you don't know where they will
    // be hosted.

    return {
      url: `http://my-domain.dev/${chunkId}`,
    };
  },
});

AppRegistry.registerComponent(appName, () => App);
```

This code will allow Re.Pack's [`ChunkManager`](../api/react-native/classes/ChunkManager) to actually locate your chunks for the student and the teacher
and download them.

### How does it work?

1. When rendering `StudentSide` or `TeacherSide` components, `React.lazy` calls the function: `() => import(...)`.
2. The implementation of dynamic `import(...)` function is handled by Webpack, but thanks to Re.Pack instead of using DOM specific code (which would crash your application),
Webpack calls [`ChunkManager.loadChunk(...)`](../api/react-native/classes/ChunkManager#loadchunk) function with string specified in [magic comment: `webpackChunkName`](https://webpack.js.org/migrate/5/#using--webpackchunkname--) - either `'student'` or `'teacher'`.
3. [`ChunkManager.loadChunk(...)`](../api/react-native/classes/ChunkManager#loadchunk) resolves the chunk location using [`ChunkManager.resolveChunk(...)`](../api/react-native/classes/ChunkManager#resolvechunk).
4. The resolution:
   - in development: resolves all chunks to the development server location for better developer experience, unless `forceRemoteChunkResolution` is set to `true`.
   - in production:
     - for remote chunks (default): calls `resolveRemoteChunk` and compares the returned `url` value with the one stored in `storage` (if provided):
       - if the values are equal: the native module will **not** download a new version, but execute already stored one
       - if the values are not equal, or `storage` was not provided, or the chunk was never downloaded before: the native module will download a chunk and execute it
     - for local chunks: resolves chunk to the filesystem location

### Caching & versioning

Providing `storage` options to [`ChunkManager.configure(...)`](../api/react-native/classes/ChunkManager#configure)
will enable caching of downloaded chunks. The `storage` option accepts anything with similar API to `AsyncStorage`'s `getItem`, `setItem` and `removeItem` functions.

The caching mechanism prevents chunk over-fetching, which helps reducing bandwidth usage, specially since the chunks can easily take up multiple MBs od data.

By default, [`ChunkManager`](../api/react-native/classes/ChunkManager) will use compare the `url` returned by `resolveRemoteChunk` with the values stored in `storage` ot determine if downloading if necessary.
Skipping the download will only happen if the values are equal, meaning you can introduce versioning of remote chunks by changing the `url`, for example:

```js
ChunkManager.configure({
  storage: AsyncStorage,
  resolveRemoteChunk: async (chunkId) => {
    const { version } = await getRemoteConfig();

    return {
      url: `http://my-domain.dev/v${version}/${chunkId}`,
    };
  },
});
```

Or by keeping the base URL inside remote config:

```js
ChunkManager.configure({
  storage: AsyncStorage,
  resolveRemoteChunk: async (chunkId) => {
    const { baseURL } = await getRemoteConfig();

    return {
      url: `${baseURL}/${chunkId}`,
    };
  },
});
```

:::info

It is possible to invalidate the cache manually using [`ChunkManager.invalidateChunks(...)`](../api/react-native/classes/ChunkManager#invalidatechunks) API,
which removes the chunk from both filesystem and from the `storage`.

:::

### Local vs remote chunks

By default all async chunks are remote chunks, meaning they are hosted on a remote server (e.g: CDN)
and downloaded on demand.

Local chunks, however, are always stored on a filesystem and bundled together with main bundle into
the final `.ipa` or `.apk` file, meaning they increase initial download size the user has to download
when installing your application.

Local chunks should only be used if you know that the majority of users will need them or if you want
to have *pre-built* features/modules.

To mark a chunk as a local chunk, you need to add it's name or a RegExp matching the chunk's name to [`OutputPlugin`'s `localChunks` option](../api/node/interfaces/OutputPluginConfig#localchunks) in your Webpack config:

```diff
    /**
     * By default Webpack will emit files into `output.path` directory (eg: `<root>/build/ios`),
     * but in order to for the React Native application to include those files (or a subset of those)
     * they need to be copied over to correct output directories supplied from React Native CLI
     * when bundling the code (with `webpack-bundle` command).
     * In development mode (when development server is running), this plugin is a no-op.
     */
    new ReactNative.OutputPlugin({
      platform,
      devServerEnabled: devServer.enabled,
+     localChunks: [/my-chunk-name/],
    }),
```

### Integration with React Navigation

You can easily integrate React components which are part of async chunks, by created a wrapper component
with `React.Suspense` and passing it to as a `component` prop to a `Screen`, e.g:

```jsx
import * as React from 'react';
import { Text } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const StudentSide = React.lazy(
  () => import(/* webpackChunkName: "student" */ './StudentSide.js')
);

const TeacherSide = React.lazy(
  () => import(/* webpackChunkName: "teacher" */ './TeacherSide.js')
);

const StudentSizeScreen = () => {
  const { params: { user } } = useRoute();
  return (
    <React.Suspense fallback={<Text>Loading...</Text>}>
      <StudentSide user={user} />
    </React.Suspense>
  );
};

const TeacherSideScreen = () => {
  const { params: { user } } = useRoute();
  return (
    <React.Suspense fallback={<Text>Loading...</Text>}>
      <TeacherSide user={user} />
    </React.Suspense>
  );
};

const Stack = createNativeStackNavigator();

export function Home() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="StudentScreen" component={StudentSizeScreen} />
      <Stack.Screen name="TeacherScreen" component={TeacherSideScreen} />
    </Stack.Navigator>
  )
}

```

:::info

React context is passed to the chunks as well, so you can use `useNavigation`, `useRoute` and other hooks
inside chunks (e.g: inside `StudentSide` or `TeacherSide` components) to access data or interact with React Navigation.

:::

### CodePush

Re.Pack is not an alternative for CodePush, and both projects aim to accomplish different use cases.

**Officially, CodePush is not supported if you're using Code Splitting with Webpack and Re.Pack.**

However, it should be possible to update the main bundle using CodePush and rely on [Caching & versioning](#caching--versioning)
to invalidate and download new chunks.

The process could be described as follows:

1. Bundle the application using Webpack and Re.Pack.
2. Upload remote chunks to a server/CDN.
3. Release application to the store.
4. Make changes to the code.
5. **Change the `url` in [`ChunkManager.configure(...)`](../api/react-native/classes/ChunkManager#configure)**.
6. Bundle the application using Webpack and Re.Pack (new main bundle and new local/remote chunks will be created).
7. Upload remote chunks to a server/CDN **under new `url` from point 5**.
8. Push main bundle using CodePush.
9. When `resolveRemoteChunk` from a new main bundle is called, it will return different `url`,
which will cause cache invalidation and new remote chunks will be downloaded.
