# Guide: Async chunks

Let's assume, we are building an E-Learning application with specific functionalities for a student 
and for a teacher. Both student and a teacher will get different UIs and different features, so it
would make sense to isolate the student's specific code from the teacher's. That's were Code
Splitting comes into play - we can use dynamic `import(...)` function together with `React.lazy` and
`React.Suspense` to conditionally render the student and the teacher sides based on the user's role.
The code for the student and the teacher will be put into a remote async chunk, so that the initial
download size will be smaller. 

:::tip

It's recommended to read:

- [Concepts](./concepts)
- [Generic usage](./usage#generic-usage)
- [Async chunks usage](./usage#async-chunks)

first, to understand Code Splitting, usage on a high-level and get the necessary context.

:::

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

Since we are using Webpack's magic comments, we need to make sure Babel is not removing those.
Add `comments: true` to your Babel config, for example:

```js
module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  comments: true,
};
```

At this point all the code used by `StudentSide.js` will be put into `student.chunk.bundle` and
`TeacherSide.js` into `teacher.chunk.bundle`.

Before we can actually render out application, we need to configure [`ScriptManager`](../api/repack/client/classes/ScriptManager)
so it can resolve out chunks:

```js
// index.js
import { AppRegistry } from 'react-native';
import { ScriptManager, Script } from '@callstack/repack/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from './src/App'; // Your application's root component
import { name as appName } from './app.json';

new ScriptManager({
  storage: AsyncStorage, // optional
  resolver: async (scriptId) => {
    // `scriptId` will be either 'student' or 'teacher'

    // In dev mode, resolve script location to dev server.
    if (__DEV__) {
      return {
        url: Script.getDevServerURL(scriptId),
        cache: false,
      };
    }

    return {
      url: Script.getRemoteURL(`http://somewhere-on-the-internet.com/${scriptId}`)
    };
  },
});

AppRegistry.registerComponent(appName, () => App);
```

This code will allow Re.Pack's [`ScriptManager`](../api/repack/client/classes/ScriptManager) to
actually locate your chunks for the student and the teacher, and download them.

When bundling for production/release, all remote chunks, including `student.chunk.bundle` and
`teacher.chunk.bundle` will be copied to `<projectRoot>/build/<platform>/remote` by default.
You should upload files from this directory to a remote server or a CDN from where `ScriptManager`
will download them.

You can change this directory using
[`remoteChunksOutput`](../api/repack/interfaces/plugins.OutputPluginConfig#remotechunksoutput)
in [`RepackPlugin`](../api/repack/classes/RepackPlugin) or [`OutputPlugin`](../api/repack/classes/plugins.OutputPlugin) configuration.

## Local vs remote chunks

By default all async chunks are remote chunks, meaning they are hosted on a remote server (e.g: CDN)
and downloaded on demand.

Local chunks, however, are always stored on a filesystem and bundled together with main bundle into
the final `.ipa` or `.apk` file, meaning they increase initial download size the user has to
download when installing your application.

Local chunks should only be used if you know that the majority of users will need them or if you
want to have *pre-built* features/modules.

:::info

Local chunks will not be copied into `<projectRoot>/build/<platform>/remote` (or directory specified
in [`remoteChunksOutput`](../api/repack/interfaces/plugins.OutputPluginConfig#remotechunksoutput)).
They will be stored next to the main bundle.

:::

To mark a chunk as a local chunk, you need to add it's name or a RegExp matching the chunk's name to
[`localChunks`](../api/repack/interfaces/plugins.OutputPluginConfig#localchunks) in
your Webpack config.

For example, if we know they majority of the users will be students, it would make sense to make 
`student` chunk a local chunk. To mark the `student` chunk as a local one, apply this diff to your
Webpack configuration:

If you're using [`RepackPlugin`](../api/repack/classes/RepackPlugin):

```diff
      new Repack.RepackPlugin({
        mode,
        platform,
        devServer,
+       output: {
+         localChunks: ['student'],
+       },
      }),
```

If you're using [`OutputPlugin`](../api/repack/classes/plugins.OutputPlugin):

```diff
      new ReactNative.OutputPlugin({
        platform,
        devServerEnabled: devServer.enabled,
+       localChunks: ['student'],
      }),
```